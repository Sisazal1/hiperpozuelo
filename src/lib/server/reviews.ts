import "server-only";
import { revalidatePath } from "next/cache";
import { ordersEnabled } from "@/config/commerce";
import { NO_REVIEWS, reviewConfig, type OwnState, type PublicReview, type ReviewData, type SubjectType } from "@/config/reviews";
import { getProductById } from "@/lib/catalog/products";
import { bundleDisplayName, getBundleById } from "@/lib/catalog/bundles";
import { dbAvailable, query, tx, type Row } from "./db";
import { AccountError, type Customer } from "./customers";

// Reseñas: solo de quien compró y recibió. Nada se siembra ni se importa.
export const reviewsEnabled = () => ordersEnabled && dbAvailable();

export function subjectPath(type: SubjectType, id: string) {
  if (type === "product") {
    const p = getProductById(id);
    return p ? `/product/${p.slug}` : null;
  }
  const b = getBundleById(id);
  return b ? `/packs/${b.category_id}/${b.tier}` : null;
}
export const subjectName = (type: SubjectType, id: string) => {
  if (type === "product") return getProductById(id)?.name_es ?? id;
  const b = getBundleById(id);
  return b ? bundleDisplayName(b) : id;
};
const refresh = (type: SubjectType, id: string) => {
  const path = subjectPath(type, id);
  if (path) revalidatePath(path);
};
const toPublic = (r: Row): PublicReview => ({
  id: r.id, rating: r.rating, body: r.body ?? "", name: r.public_name, at: r.created_at, edited: r.updated_at !== r.created_at, reply: r.reply, replyAt: r.reply_at,
});

/** Lo que ve cualquiera: publicadas y de pedidos reales. Nunca las de pedidos de prueba. */
export async function reviewData(type: SubjectType, id: string): Promise<ReviewData> {
  // En la compilación no se abre la base de datos: la página se genera al pedirla por primera vez.
  if (!reviewsEnabled() || process.env.NEXT_PHASE === "phase-production-build") return { ...NO_REVIEWS, enabled: reviewsEnabled() };
  try {
    const rows = await query("select * from reviews where subject_type=$1 and subject_id=$2 and status='published' and not test order by created_at desc limit 200", [type, id]);
    const [s] = await query(
      `select count(*)::int as n, coalesce(sum(rating),0)::int as total, ${[1, 2, 3, 4, 5].map((k) => `count(*) filter (where rating=${k})::int as r${k}`).join(", ")}
       from reviews where subject_type=$1 and subject_id=$2 and status='published' and not test`,
      [type, id],
    );
    return { enabled: true, count: s.n, average: s.n ? Math.round((s.total / s.n) * 10) / 10 : 0, dist: [s.r1, s.r2, s.r3, s.r4, s.r5], list: rows.map(toPublic) };
  } catch (e) {
    console.error("reviews", (e as Error).message);
    return { ...NO_REVIEWS, enabled: true };
  }
}

// Pedido vinculado, entregado o recogido, en plazo (días naturales en hora de Madrid) y que contiene el artículo.
const IN_TIME = `o.status='delivered' and o.delivered_at is not null
  and (now() at time zone 'Europe/Madrid')::date <= (o.delivered_at at time zone 'Europe/Madrid')::date + ${reviewConfig.days}`;
const CONTAINS = `exists (select 1 from order_items i where i.order_id=o.id and (
    ($2='bundle' and i.kind='bundle' and i.ref=$3)
    or ($2='product' and ((i.kind='product' and i.ref=$3) or exists (select 1 from jsonb_array_elements(i.components) c where c->>'id'=$3 and (c->>'n')::int > 0)))))`;
const NOT_YET = "not exists (select 1 from reviews r where r.order_id=o.id and r.subject_type=$2 and r.subject_id=$3)";

const until = (deliveredAt: string) =>
  new Date(new Date(deliveredAt).getTime() + reviewConfig.days * 86400_000).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" });
export const defaultName = (c: Customer) => {
  const [first, second] = (c.name ?? "").split(" ").filter(Boolean);
  return first ? `${first}${second ? ` ${second[0].toUpperCase()}.` : ""}`.slice(0, 40) : "";
};

export async function ownState(c: Customer | null, type: SubjectType, id: string): Promise<OwnState> {
  if (!c) return { signedIn: false, canReview: null, name: "", mine: [] };
  const [o] = await query(`select code,delivered_at from orders o where o.customer_id=$1 and ${IN_TIME} and ${CONTAINS} and ${NOT_YET} order by delivered_at desc limit 1`, [c.id, type, id]);
  const mine = await query("select r.*, o.code from reviews r join orders o on o.id=r.order_id where r.customer_id=$1 and r.subject_type=$2 and r.subject_id=$3 and r.status in ('published','removed') order by r.created_at desc", [c.id, type, id]);
  return {
    signedIn: true,
    canReview: o ? { code: o.code, until: until(o.delivered_at) } : null,
    name: defaultName(c),
    mine: mine.map((r) => ({ ...toPublic(r), test: r.test, status: r.status, reason: r.removed_reason, code: r.code })),
  };
}

function clean(b: Record<string, unknown>) {
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AccountError("Elige de 1 a 5 estrellas.", 422);
  // eslint-disable-next-line no-control-regex
  const body = String(b.text ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (body.length > reviewConfig.maxText) throw new AccountError(`El texto admite hasta ${reviewConfig.maxText} caracteres.`, 422);
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) throw new AccountError("Escribe el nombre que se verá, de 2 a 40 caracteres.", 422);
  if (/@|https?:|www\.|\d{6,}/i.test(name)) throw new AccountError("El nombre público no puede llevar un email, un enlace ni un teléfono.", 422);
  return { rating, body, name };
}

export async function createReview(c: Customer, b: Record<string, unknown>) {
  const type = b.type === "bundle" ? "bundle" : "product";
  const id = String(b.id ?? "");
  if (!subjectPath(type, id)) throw new AccountError("Ese artículo no existe.", 404);
  const r = clean(b);
  await tx(async (q) => {
    const [o] = await q(`select o.id,o.test from orders o where o.customer_id=$1 and ${IN_TIME} and ${CONTAINS} and ${NOT_YET} order by o.delivered_at desc limit 1 for update`, [c.id, type, id]);
    if (!o) throw new AccountError("Solo puedes opinar si tu pedido está entregado y en plazo.", 403);
    const [row] = await q(
      "insert into reviews (subject_type,subject_id,customer_id,order_id,rating,body,public_name,test) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (order_id,subject_type,subject_id) do nothing returning id",
      [type, id, c.id, o.id, r.rating, r.body, r.name, o.test],
    );
    if (!row) throw new AccountError("Ya has opinado sobre este artículo con ese pedido.", 409);
  });
  refresh(type, id);
}
export async function editReview(c: Customer, b: Record<string, unknown>) {
  const r = clean(b);
  const [row] = await query("update reviews set rating=$3, body=$4, public_name=$5, updated_at=now() where id=$1 and customer_id=$2 and status='published' returning subject_type,subject_id", [
    Math.floor(Number(b.review)) || 0, c.id, r.rating, r.body, r.name,
  ]);
  if (!row) throw new AccountError("No encontramos esa reseña.", 404);
  refresh(row.subject_type, row.subject_id);
}
/** El autor la borra. Si estaba retirada, se vacía pero queda la marca: no se puede volver a publicar por esa vía. */
export async function deleteReview(c: Customer, reviewId: unknown) {
  const id = Math.floor(Number(reviewId)) || 0;
  const [gone] = await query("delete from reviews where id=$1 and customer_id=$2 and status='published' returning subject_type,subject_id", [id, c.id]);
  const row = gone ?? (await query("update reviews set status='erased', body='', public_name='', updated_at=now() where id=$1 and customer_id=$2 and status='removed' returning subject_type,subject_id", [id, c.id]))[0];
  if (!row) throw new AccountError("No encontramos esa reseña.", 404);
  refresh(row.subject_type, row.subject_id);
}

/** Artículos recibidos que aún se pueden reseñar. */
export async function pendingReviews(customerId: string) {
  const rows = await query(
    `select o.id as order_id, o.code, o.delivered_at, i.kind, i.ref, i.components from orders o join order_items i on i.order_id=o.id
     where o.customer_id=$1 and ${IN_TIME} order by o.delivered_at desc`,
    [customerId],
  );
  const done = new Set((await query("select order_id,subject_type,subject_id from reviews where customer_id=$1", [customerId])).map((r) => `${r.order_id}|${r.subject_type}|${r.subject_id}`));
  const out = new Map<string, { type: SubjectType; id: string; name: string; href: string; until: string }>();
  for (const r of rows) {
    const subjects: [SubjectType, string][] = [];
    if (r.kind === "bundle") subjects.push(["bundle", r.ref]);
    for (const c of r.components as { id: string; n: number }[]) if (c.n > 0) subjects.push(["product", c.id]);
    for (const [type, id] of subjects) {
      const href = subjectPath(type, id);
      const key = `${type}|${id}`;
      if (href && !out.has(key) && !done.has(`${r.order_id}|${key}`)) out.set(key, { type, id, name: subjectName(type, id), href: `${href}#resenas`, until: until(r.delivered_at) });
    }
  }
  return [...out.values()];
}
export const exportReviews = async (customerId: string) =>
  (await query("select subject_type,subject_id,rating,body,public_name,status,created_at,reply from reviews where customer_id=$1 order by id", [customerId])).map((r) => ({
    articulo: subjectName(r.subject_type, r.subject_id), estrellas: r.rating, texto: r.body, nombre_publico: r.public_name, estado: r.status, fecha: r.created_at, respuesta: r.reply,
  }));

/** Antes de borrar la cuenta se anotan las páginas; después se renuevan. */
export async function refreshReviewsOf(customerId: string) {
  const rows = await query("select distinct subject_type,subject_id from reviews where customer_id=$1", [customerId]);
  return () => rows.forEach((r) => refresh(r.subject_type, r.subject_id));
}

// ---------- Moderación ----------
export const listReviews = () => query("select r.*, o.code from reviews r join orders o on o.id=r.order_id where r.status <> 'erased' order by r.created_at desc limit 200");

export async function removeReview(id: number, reason: string, detail: string, staff: string) {
  if (!reviewConfig.reasons[reason]) return "Elige uno de los motivos permitidos.";
  if (detail.trim().length < 5) return "Explica qué parte incumple: queda registrado.";
  const [row] = await query("update reviews set status='removed', removed_reason=$2, removed_detail=$3, removed_by=$4, removed_at=now() where id=$1 and status='published' returning subject_type,subject_id", [
    id, reviewConfig.reasons[reason], detail.trim().slice(0, 300), staff,
  ]);
  if (!row) return "La reseña ya no está publicada.";
  refresh(row.subject_type, row.subject_id);
  return null;
}
export async function restoreReview(id: number, staff: string) {
  const [row] = await query("update reviews set status='published', removed_detail=coalesce(removed_detail,'') || ' · Republicada por ' || $2 where id=$1 and status='removed' returning subject_type,subject_id", [id, staff]);
  if (!row) return "La reseña no está retirada.";
  refresh(row.subject_type, row.subject_id);
  return null;
}
export async function replyReview(id: number, text: string, staff: string) {
  const t = text.trim().slice(0, 600);
  const [row] = await query("update reviews set reply=$2, reply_by=$3, reply_at=case when $2::text is null then null else now() end where id=$1 and status='published' returning subject_type,subject_id", [id, t || null, staff]);
  if (!row) return "La reseña no está publicada.";
  refresh(row.subject_type, row.subject_id);
  return null;
}
