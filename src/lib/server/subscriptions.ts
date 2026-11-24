import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { cleanItems, cleanWeeks, pricedItems, subscriptionConfig, subscriptionQuote, weeksLabel, type Priced } from "@/config/subscription";
import { normalizePostalCode, zoneFor, type DeliveryMethod } from "@/config/commerce";
import { getProductById } from "@/lib/catalog/products";
import { dbAvailable, query, tx, type Exec, type Row } from "./db";
import { createPaidCycle, normalizePhone, shortages, type PricedLine } from "./orders";
import { stripeClient, stripeIsTest } from "./stripe";
import { mailEnabled, sendMail } from "./mail";

export class SubscriptionError extends Error {
  constructor(message: string, public status = 400, public fields?: Record<string, string>) {
    super(message);
  }
}
/** Sin base de datos o sin Stripe, la suscripción no se ofrece. */
export const subscriptionsEnabled = () => dbAvailable() && Boolean(process.env.STRIPE_SECRET_KEY);

const DAY = 86400;
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? ""));
const log = (q: Exec, id: string, label: string, actor: string) => q("insert into subscription_events (subscription_id,label,actor) values ($1,$2,$3)", [id, label, actor]);
const stripe = () => {
  const s = stripeClient();
  if (!s) throw new SubscriptionError("El pago no está disponible ahora mismo.", 503);
  return s;
};

export async function subItems(id: string): Promise<Priced[]> {
  const rows = await query("select product_id,quantity,unit from subscription_items where subscription_id=$1 order by product_id", [id]);
  return rows.map((r) => ({ id: r.product_id, n: r.quantity, unit: r.unit, name: getProductById(r.product_id)?.name_es ?? r.product_id }));
}
const describe = (items: Priced[]) => items.map((i) => `${i.n} × ${i.name}`).join(", ");
const recurring = (weeks: number) => ({ interval: "week" as const, interval_count: weeks });

// ---------- Alta ----------
export async function startSubscription(b: Record<string, any>, customerId: string | null, origin: string) {
  const s = stripe();
  const items = cleanItems(b.items);
  const weeks = cleanWeeks(b.weeks);
  if (!items?.length || !weeks) throw new SubscriptionError("Elige al menos un artículo y la frecuencia.");
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
  const c = { name: text(b.customer?.name, 80), email: text(b.customer?.email, 120).toLowerCase(), phone: normalizePhone(b.customer?.phone) };
  const delivery: DeliveryMethod = b.delivery === "delivery" ? "delivery" : "collect";
  const a = { line: text(b.address?.line, 120), postalCode: normalizePostalCode(b.address?.postalCode), city: "", note: text(b.address?.note, 160) };
  const fields: Record<string, string> = {};
  if (c.name.length < 2) fields.name = "Escribe tu nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) fields.email = "Revisa el email.";
  if (!/^[6-9]\d{8}$/.test(c.phone)) fields.phone = "Escribe un teléfono español de 9 cifras.";
  if (delivery === "delivery") {
    const zone = zoneFor(a.postalCode);
    if (!zone) fields.postalCode = "De momento repartimos en Pozuelo de Alarcón y Aravaca. Puedes recogerlo gratis en tienda.";
    else a.city = zone;
    if (a.line.length < 5) fields.line = "Escribe calle, número y piso.";
  }
  if (b.consent !== true) fields.consent = "Marca la casilla para autorizar los cobros periódicos.";
  if (Object.keys(fields).length) throw new SubscriptionError("Revisa los datos.", 422, fields);
  const priced = pricedItems(items);
  const quote = subscriptionQuote(priced, delivery);
  if (quote.missing) throw new SubscriptionError(`El mínimo por ciclo es ${subscriptionConfig.minAfterDiscount} €.`, 422);
  const lack = await shortages(linesOf(priced));
  if (lack.length) throw new SubscriptionError(`No quedan unidades suficientes: ${lack.map((m) => `${m.name} (${m.available})`).join(", ")}.`, 409);

  const id = randomUUID();
  const token = randomBytes(18).toString("base64url");
  await tx(async (q) => {
    await q(
      `insert into subscriptions (id,token,customer_id,status,weeks,delivery,customer_name,email,phone,address,postal_code,city,delivery_note,consent_at,test)
       values ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13)`,
      [id, token, customerId, weeks, delivery, c.name, c.email, c.phone, ...(delivery === "delivery" ? [a.line, a.postalCode, a.city, a.note || null] : [null, null, null, null]), stripeIsTest()],
    );
    for (const i of priced) await q("insert into subscription_items (subscription_id,product_id,quantity,unit) values ($1,$2,$3,$4)", [id, i.id, i.n, i.unit]);
  });
  // Precio y descuento salen del servidor. Solo tarjeta (y sus wallets): ni Bizum ni Klarna admiten cobros periódicos aquí.
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    locale: "es",
    customer_email: c.email,
    client_reference_id: id,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: quote.goods, recurring: recurring(weeks), product_data: { name: "Reposición Hiper Pozuelo", description: describe(priced).slice(0, 500), metadata: { kind: "goods" } } },
      },
      ...(quote.shipping
        ? [{ quantity: 1, price_data: { currency: "eur", unit_amount: quote.shipping, recurring: recurring(weeks), product_data: { name: "Entrega a domicilio", metadata: { kind: "shipping" } } } }]
        : []),
    ],
    subscription_data: { description: `Reposición · ${weeksLabel(weeks).toLowerCase()}`, metadata: { hp_subscription: id } },
    custom_text: { submit: { message: `Se cobra hoy y después ${weeksLabel(weeks).toLowerCase()}, hasta que la canceles desde tu enlace de gestión.` } },
    expires_at: Math.floor(Date.now() / 1000) + 45 * 60,
    success_url: `${origin}/suscripcion/${token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/reposicion/suscripcion?cancelada=1`,
    metadata: { hp_subscription: id },
  });
  await query("update subscriptions set stripe_session_id=$2 where id=$1", [id, session.id]);
  return session.url;
}

// ---------- Sincronización con Stripe (webhook y vuelta del pago; siempre idempotente) ----------
function statusOf(s: Stripe.Subscription) {
  if (s.status === "canceled" || s.status === "incomplete_expired") return "cancelled";
  if (s.status === "incomplete") return "pending";
  if (s.status === "past_due" || s.status === "unpaid") return "past_due";
  return s.pause_collection ? "paused" : "active";
}

export async function syncSession(session: { id: string; subscription: string | { id: string } | null; payment_status: string }) {
  const subId = idOf(session.subscription);
  if (!subId) return;
  await query("update subscriptions set stripe_subscription_id=$2 where stripe_session_id=$1 and stripe_subscription_id is null", [session.id, subId]);
  const sub = await syncSubscription(subId);
  if (sub && session.payment_status === "paid" && sub.latest_invoice) await syncInvoice(idOf(sub.latest_invoice));
}

export async function expireSession(sessionId: string) {
  await query("update subscriptions set status='expired', updated_at=now() where stripe_session_id=$1 and status='pending'", [sessionId]);
}

/** Copia el estado de Stripe. Se relee siempre: el contenido del evento puede llegar desordenado o repetido. */
export async function syncSubscription(subId: string) {
  const s = await stripe().subscriptions.retrieve(subId);
  const status = statusOf(s);
  await tx(async (q) => {
    const [row] = await q("select * from subscriptions where stripe_subscription_id=$1 or (id=$2 and stripe_subscription_id is null) for update", [subId, s.metadata?.hp_subscription ?? ""]);
    if (!row) return;
    const next = status === "active" || status === "past_due" ? new Date(s.current_period_end * 1000) : null;
    await q(
      `update subscriptions set stripe_subscription_id=$2, stripe_customer_id=$3, status=$4, next_cycle_at=$5, notice_at=$6,
         cancelled_at=case when $4='cancelled' then coalesce(cancelled_at,now()) else null end, updated_at=now() where id=$1`,
      [row.id, subId, idOf(s.customer), status, next?.toISOString() ?? null, next ? new Date(next.getTime() - subscriptionConfig.noticeDays * DAY * 1000).toISOString() : null],
    );
    if (row.status !== status) await log(q, row.id, SUB_LABEL[status] ?? status, "Stripe");
  });
  return s;
}

export const SUB_LABEL: Record<string, string> = {
  pending: "Sin terminar",
  active: "Activa",
  paused: "En pausa",
  past_due: "Pago fallido",
  cancelled: "Cancelada",
  expired: "Pago no completado",
};

const linesOf = (items: Priced[]): PricedLine[] => items.map((i) => ({ kind: "product", ref: i.id, name: i.name, unit: i.unit, quantity: i.n, components: [{ id: i.id, n: 1 }] }));

/** Una factura pagada = un pedido pagado. Idempotente por id de factura. */
export async function syncInvoice(invoiceId: string) {
  const inv = await stripe().invoices.retrieve(invoiceId);
  const subId = idOf(inv.subscription);
  if (!subId || inv.status !== "paid" || inv.amount_paid <= 0) return null; // Saltos y pausas dejan facturas de 0 €: no son un ciclo.
  await syncSubscription(subId);
  return tx(async (q) => {
    const [sub] = await q("select * from subscriptions where stripe_subscription_id=$1 for update", [subId]);
    if (!sub) return null;
    const rows = await q("select product_id,quantity,unit from subscription_items where subscription_id=$1 order by product_id", [sub.id]);
    const items: Priced[] = rows.map((r) => ({ id: r.product_id, n: r.quantity, unit: r.unit, name: getProductById(r.product_id)?.name_es ?? r.product_id }));
    const quote = subscriptionQuote(items, sub.delivery);
    const lines = linesOf(items);
    const lack = await shortages(lines, q);
    const review = [
      inv.amount_paid !== quote.total ? `Cobrado ${(inv.amount_paid / 100).toFixed(2)} € y el ciclo suma ${(quote.total / 100).toFixed(2)} €` : "",
      lack.length ? `Falta stock: ${lack.map((m) => `${m.name} (${m.available})`).join(", ")}` : "",
    ].filter(Boolean).join(" · ");
    const order = await createPaidCycle(q, {
      key: `factura:${invoiceId}`,
      subscriptionId: sub.id,
      customerId: sub.customer_id,
      delivery: sub.delivery,
      customer: { name: sub.customer_name, email: sub.email, phone: sub.phone },
      address: sub.delivery === "delivery" ? { line: sub.address, postalCode: sub.postal_code, city: sub.city, note: sub.delivery_note } : undefined,
      lines,
      totals: { subtotal: quote.subtotal, discount: quote.discount, shipping: quote.shipping, surcharge: 0, total: quote.total, discountCode: null },
      paymentIntent: idOf(inv.payment_intent as string | { id: string } | null),
      amount: inv.amount_paid,
      review: review || null,
      test: sub.test,
    });
    if (order.fresh) await log(q, sub.id, `Ciclo cobrado: ${order.row.code}`, "Stripe");
    return order.row as Row;
  });
}

export async function paymentFailed(invoiceId: string) {
  const inv = await stripe().invoices.retrieve(invoiceId);
  const subId = idOf(inv.subscription);
  if (!subId) return;
  await syncSubscription(subId);
  const [row] = await query("select id from subscriptions where stripe_subscription_id=$1", [subId]);
  if (!row) return;
  const label = `Cobro rechazado (${invoiceId.slice(-6)})`;
  await query("insert into subscription_events (subscription_id,label,actor) select $1,$2,'Stripe' where not exists (select 1 from subscription_events where subscription_id=$1 and label=$2)", [row.id, label]);
}

// ---------- Gestión ----------
export async function getSubscription(token: string) {
  if (!/^[\w-]{20,40}$/.test(token)) return null;
  const [row] = await query("select * from subscriptions where token=$1 and status not in ('pending','expired')", [token]);
  return row ?? null;
}
export const subscriptionOrders = (id: string) => query("select code,token,status,total,created_at from orders where subscription_id=$1 order by created_at desc limit 24", [id]);
export const customerSubscriptions = (id: string) => query("select * from subscriptions where customer_id=$1 and status not in ('pending','expired') order by created_at desc", [id]);

async function live(token: unknown) {
  const row = await getSubscription(String(token ?? ""));
  if (!row) throw new SubscriptionError("No encontramos esa suscripción.", 404);
  return row;
}
const need = (row: Row, ...ok: string[]) => {
  if (!ok.includes(row.status)) throw new SubscriptionError(`Ahora mismo la suscripción está en estado «${SUB_LABEL[row.status]}».`, 409);
};
/** Lleva el próximo cobro a una fecha sin facturar nada entre medias. */
const chargeOn = (at: number) => ({ trial_end: at, proration_behavior: "none" as const });

export async function skipNext(token: unknown, actor: string) {
  const row = await live(token);
  need(row, "active");
  const s = await stripe().subscriptions.retrieve(row.stripe_subscription_id);
  const step = row.weeks * 7 * DAY;
  // Solo un salto a la vez: el próximo cobro no puede quedar a más de dos ciclos.
  const now = s.test_clock ? (await stripe().testHelpers.testClocks.retrieve(idOf(s.test_clock))).frozen_time : Math.floor(Date.now() / 1000);
  if (s.current_period_end - now > step + DAY) throw new SubscriptionError("Ya has saltado el próximo envío.", 409);
  await stripe().subscriptions.update(s.id, chargeOn(s.current_period_end + step));
  await log(query, row.id, "Próximo ciclo saltado", actor);
  await syncSubscription(s.id);
}
export async function pause(token: unknown, actor: string) {
  const row = await live(token);
  need(row, "active");
  // «void»: Stripe anula las facturas de los ciclos en pausa. Ni se cobran ni generan pedido.
  await stripe().subscriptions.update(row.stripe_subscription_id, { pause_collection: { behavior: "void" } });
  await log(query, row.id, "Pausada", actor);
  await syncSubscription(row.stripe_subscription_id);
}
export async function resume(token: unknown, actor: string) {
  const row = await live(token);
  need(row, "paused");
  await stripe().subscriptions.update(row.stripe_subscription_id, { pause_collection: "" });
  await log(query, row.id, "Reanudada", actor);
  await syncSubscription(row.stripe_subscription_id);
}
export async function cancel(token: unknown, actor: string) {
  const row = await live(token);
  need(row, "active", "paused", "past_due");
  await stripe().subscriptions.cancel(row.stripe_subscription_id);
  await log(query, row.id, "Cancelada por el cliente", actor);
  await syncSubscription(row.stripe_subscription_id);
}

export async function change(token: unknown, b: Record<string, unknown>, actor: string) {
  const row = await live(token);
  need(row, "active");
  const items = cleanItems(b.items);
  const weeks = cleanWeeks(b.weeks);
  if (!items?.length || !weeks) throw new SubscriptionError("Elige al menos un artículo y la frecuencia.", 422);
  const priced = pricedItems(items);
  const quote = subscriptionQuote(priced, row.delivery);
  if (quote.missing) throw new SubscriptionError(`El mínimo por ciclo es ${subscriptionConfig.minAfterDiscount} €.`, 422);
  const st = stripe();
  const s = await st.subscriptions.retrieve(row.stripe_subscription_id, { expand: ["items.data.price.product"] });
  const kindOf = (i: Stripe.SubscriptionItem) => (i.price.product as Stripe.Product).metadata?.kind;
  const goods = s.items.data.find((i) => kindOf(i) === "goods") ?? s.items.data[0];
  const ship = s.items.data.find((i) => kindOf(i) === "shipping");
  const priceOf = (product: string, unit_amount: number) => ({ currency: "eur", product, unit_amount, recurring: recurring(weeks) });
  const goodsProduct = idOf(goods.price.product as Stripe.Product);
  const updates: Stripe.SubscriptionUpdateParams.Item[] = [{ id: goods.id, price_data: priceOf(goodsProduct, quote.goods) }];
  if (ship) updates.push(quote.shipping ? { id: ship.id, price_data: priceOf(idOf(ship.price.product as Stripe.Product), quote.shipping) } : { id: ship.id, deleted: true });
  else if (quote.shipping) {
    const p = await st.products.create({ name: "Entrega a domicilio", metadata: { kind: "shipping" } });
    updates.push({ price_data: priceOf(p.id, quote.shipping) });
  }
  // Cambiar de frecuencia reiniciaría el ciclo y cobraría ya: se mantiene la fecha del próximo cobro.
  await st.subscriptions.update(s.id, {
    items: updates,
    proration_behavior: "none",
    description: `Reposición · ${weeksLabel(weeks).toLowerCase()}`,
    ...(weeks !== row.weeks || s.status === "trialing" ? { trial_end: s.current_period_end } : {}),
  });
  await st.products.update(goodsProduct, { description: describe(priced).slice(0, 500) });
  await tx(async (q) => {
    await q("update subscriptions set weeks=$2, updated_at=now() where id=$1", [row.id, weeks]);
    await q("delete from subscription_items where subscription_id=$1", [row.id]);
    for (const i of priced) await q("insert into subscription_items (subscription_id,product_id,quantity,unit) values ($1,$2,$3,$4)", [row.id, i.id, i.n, i.unit]);
    await log(q, row.id, `Cambio: ${describe(priced)} · ${weeksLabel(weeks).toLowerCase()}`, actor);
  });
  await syncSubscription(s.id);
}

/** Portal de Stripe: solo tarjeta y facturas; lo demás se gestiona en nuestra página. */
let portal: Promise<string> | null = null;
export async function portalUrl(token: unknown, origin: string) {
  const row = await live(token);
  const st = stripe();
  portal ??= (async () => {
    const found = (await st.billingPortal.configurations.list({ limit: 100, active: true })).data.find((c) => c.metadata?.hp === "reposicion-1");
    if (found) return found.id;
    const c = await st.billingPortal.configurations.create({
      business_profile: { headline: "Hiper Pozuelo" },
      features: { payment_method_update: { enabled: true }, invoice_history: { enabled: true } },
      metadata: { hp: "reposicion-1" },
    });
    return c.id;
  })().catch((e) => {
    portal = null;
    throw e;
  });
  const session = await st.billingPortal.sessions.create({ customer: row.stripe_customer_id, configuration: await portal, return_url: `${origin}/suscripcion/${row.token}`, locale: "es" });
  return session.url;
}

export async function linkSubscription(token: unknown, customerId: string) {
  const row = await live(token);
  if (row.customer_id === customerId) return;
  const [ok] = await query("update subscriptions set customer_id=$2, updated_at=now() where id=$1 and customer_id is null returning id", [row.id, customerId]);
  if (!ok) throw new SubscriptionError("Esta suscripción no se puede añadir a tu cuenta.", 409);
}

/** Al eliminar la cuenta se cancelan sus suscripciones: nadie paga algo que ya no puede ver. */
export async function cancelAllFor(customerId: string) {
  for (const s of await customerSubscriptions(customerId)) if (["active", "paused", "past_due"].includes(s.status)) await cancel(s.token, "Cuenta eliminada");
}

// ---------- Backoffice y aviso previo ----------
export const listSubscriptions = () =>
  query(`select s.*, coalesce((select json_agg(json_build_object('id',i.product_id,'n',i.quantity) order by i.product_id) from subscription_items i where i.subscription_id=s.id),'[]') as items,
    (select count(*)::int from orders o where o.subscription_id=s.id) as cycles,
    (select label from subscription_events e where e.subscription_id=s.id order by e.id desc limit 1) as last_event
    from subscriptions s where status not in ('pending','expired') order by (status='cancelled'), next_cycle_at nulls last limit 200`);

/** Avisos previos vencidos. Listo para llamarse desde una tarea diaria; sin proveedor de email no marca nada como enviado. */
export async function sendDueNotices() {
  if (!mailEnabled()) return 0;
  let sent = 0;
  for (const s of await query("select * from subscriptions where status='active' and notice_at <= now() and (noticed_for is null or noticed_for <> next_cycle_at)")) {
    const when = new Date(s.next_cycle_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" });
    if (await sendMail({ to: s.email, subject: "Tu próxima reposición", text: `El ${when} se cobra tu próxima reposición. Puedes saltarla, cambiarla o cancelarla desde tu enlace de gestión.` })) {
      await query("update subscriptions set noticed_for=next_cycle_at where id=$1", [s.id]);
      sent++;
    }
  }
  return sent;
}
