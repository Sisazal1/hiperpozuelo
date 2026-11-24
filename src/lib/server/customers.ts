import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { dbAvailable, query, tx, type Row } from "./db";
import { findForCustomer, normalizePhone } from "./orders";
import { clientIp } from "./auth";
import { getProductById } from "@/lib/catalog/products";
import { normalizePostalCode, zoneFor } from "@/config/commerce";

// Cuenta de cliente, opcional. Cookie y sesiones propias: no comparte nada con hp_staff (backoffice).
const COOKIE = "hp_customer";
const DAYS = 30;
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

export class AccountError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
export type Customer = { id: string; email: string; name: string | null; phone: string | null; marketing: boolean; created_at: string; has_password: boolean; email_verified_at: string | null };

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const derive = (password: string, salt: Buffer, o = SCRYPT) =>
  new Promise<Buffer>((ok, ko) => scrypt(password.normalize("NFKC"), salt, 32, o, (e, k) => (e ? ko(e) : ok(k))));
async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${(await derive(password, salt)).toString("base64url")}`;
}
// Se calcula igual aunque el email no exista: el tiempo de respuesta no lo delata.
const DUMMY = `scrypt$${SCRYPT.N}$8$1$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(32).toString("base64url")}`;
async function checkPassword(password: string, stored: string | null) {
  const [, N, r, p, salt, key] = (stored ?? DUMMY).split("$");
  const a = Buffer.from(key, "base64url");
  const b = await derive(password, Buffer.from(salt, "base64url"), { ...SCRYPT, N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(a, b) && Boolean(stored);
}

export const cleanEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 120) : "");
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
function assertPassword(p: unknown, email: string): asserts p is string {
  if (typeof p !== "string" || p.length < 10 || p.length > 128) throw new AccountError("La contraseña debe tener al menos 10 caracteres.", 422);
  if (p.toLowerCase() === email) throw new AccountError("Usa una contraseña distinta de tu email.", 422);
}

// ---------- Límite de intentos, por IP y por email ----------
async function throttle(kind: string, limits: [string, number][]) {
  for (const [who, max] of limits) {
    const key = `${kind}:${who}`;
    const [{ n }] = await query("select count(*)::int as n from login_attempts where ip=$1 and at > now() - interval '15 minutes'", [key]);
    if (n >= max) throw new AccountError("Demasiados intentos. Espera 15 minutos.", 429);
  }
  return async () => {
    for (const [who] of limits) await query("insert into login_attempts (ip) values ($1)", [`${kind}:${who}`]);
  };
}

// ---------- Sesiones ----------
async function openSession(customerId: string) {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (old) await query("delete from customer_sessions where token_hash=$1", [sha(old)]);
  const token = randomBytes(32).toString("base64url");
  await query("insert into customer_sessions (token_hash,customer_id,expires_at) values ($1,$2,now() + $3::int * interval '1 day')", [sha(token), customerId, DAYS]);
  await query("delete from customer_sessions where expires_at < now()");
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: Boolean(process.env.VERCEL), path: "/", maxAge: DAYS * 86400 });
}

const PUBLIC = "c.id,c.email,c.name,c.phone,c.marketing,c.created_at,c.email_verified_at,(c.password_hash is not null) as has_password";
export async function currentCustomer(): Promise<Customer | null> {
  if (!dbAvailable()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [c] = await query(`select ${PUBLIC} from customer_sessions s join customers c on c.id=s.customer_id where s.token_hash=$1 and s.expires_at > now()`, [sha(token)]);
  return (c as Customer) ?? null;
}
export async function requireCustomer() {
  const c = await currentCustomer();
  if (!c) throw new AccountError("Entra en tu cuenta para continuar.", 401);
  return c;
}
export async function logout(everywhere = false) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    if (everywhere) await query("delete from customer_sessions where customer_id=(select customer_id from customer_sessions where token_hash=$1)", [sha(token)]);
    else await query("delete from customer_sessions where token_hash=$1", [sha(token)]);
  }
  jar.set(COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- Alta y acceso ----------
type Signup = { email: string; password: unknown; name?: unknown; marketing?: unknown; terms?: unknown };
async function insertCustomer(s: Signup) {
  if (!validEmail(s.email)) throw new AccountError("Revisa el email.", 422);
  assertPassword(s.password, s.email);
  if (s.terms !== true) throw new AccountError("Acepta las condiciones para crear la cuenta.", 422);
  const ip = await clientIp();
  const hit = await throttle("alta", [[ip, 8]]);
  await hit();
  const hash = await hashPassword(s.password);
  const name = typeof s.name === "string" ? s.name.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const [c] = await query(
    "insert into customers (id,email,password_hash,name,marketing,marketing_at,terms_at) values ($1,$2,$3,$4,$5,case when $5 then now() end,now()) on conflict (email) do nothing returning id",
    [randomUUID(), s.email, hash, name || null, s.marketing === true],
  );
  // Mismo mensaje para cualquier fallo de alta: no confirma que el email exista.
  if (!c) throw new AccountError("No hemos podido crear la cuenta con esos datos. Si ya tienes una, entra con tu contraseña.", 409);
  return c.id as string;
}
export async function register(s: Signup) {
  const id = await insertCustomer(s);
  await openSession(id);
}
/** Alta tras comprar como invitado: quien tiene el enlace del pedido demuestra que es suyo. */
export async function registerFromOrder(token: string, s: Omit<Signup, "email">) {
  const [o] = await query("select id,email,customer_name,customer_id from orders where token=$1 and channel='web' and status not in ('awaiting_payment','abandoned')", [token]);
  if (!o?.email || o.customer_id) throw new AccountError("Este pedido no se puede vincular.", 409);
  const id = await insertCustomer({ ...s, email: o.email, name: o.customer_name });
  await linkOrderRow(o.id, id);
  await openSession(id);
}
export async function login(emailIn: unknown, password: unknown) {
  const email = cleanEmail(emailIn);
  if (!validEmail(email) || typeof password !== "string" || password.length > 128) throw new AccountError("Email o contraseña incorrectos.", 401);
  const fail = await throttle("acceso", [[await clientIp(), 20], [sha(email), 8]]);
  const [c] = await query("select id,password_hash from customers where email=$1", [email]);
  if (!(await checkPassword(password, c?.password_hash ?? null))) {
    await fail();
    throw new AccountError("Email o contraseña incorrectos.", 401);
  }
  await query("delete from login_attempts where ip=$1", [`acceso:${sha(email)}`]);
  await openSession(c.id);
}
export async function changePassword(c: Customer, current: unknown, next: unknown) {
  const fail = await throttle("clave", [[c.id, 8]]);
  const [row] = await query("select password_hash from customers where id=$1", [c.id]);
  if (row.password_hash && !(typeof current === "string" && (await checkPassword(current.slice(0, 128), row.password_hash)))) {
    await fail();
    throw new AccountError("La contraseña actual no es correcta.", 401);
  }
  assertPassword(next, c.email);
  await query("update customers set password_hash=$2, updated_at=now() where id=$1", [c.id, await hashPassword(next)]);
  await query("delete from customer_sessions where customer_id=$1", [c.id]);
  await openSession(c.id);
}

/** Google devuelve un email verificado. Nunca se fusiona con una cuenta de contraseña sin verificar: podría ser de otra persona. */
export async function loginWithGoogle(g: { sub: string; email: string; name?: string }) {
  const email = cleanEmail(g.email);
  const [bySub] = await query("select id from customers where google_sub=$1", [g.sub]);
  if (bySub) return openSession(bySub.id);
  const [c] = await query(
    "insert into customers (id,email,name,google_sub,email_verified_at,terms_at) values ($1,$2,$3,$4,now(),now()) on conflict (email) do nothing returning id",
    [randomUUID(), email, g.name?.slice(0, 80) || null, g.sub],
  );
  if (!c) throw new AccountError("Ya hay una cuenta con ese email. Entra con tu contraseña.", 409);
  await openSession(c.id);
}

// ---------- Pedidos: uno solo por cuenta, y siempre demostrando que es tuyo ----------
async function linkOrderRow(orderId: string, customerId: string) {
  const [o] = await query("update orders set customer_id=$2, linked_at=now(), updated_at=now() where id=$1 and customer_id is null returning id", [orderId, customerId]);
  return Boolean(o);
}
export async function linkByCode(c: Customer, code: unknown, contact: unknown) {
  const ip = await clientIp();
  const fail = await throttle("vincular", [[ip, 10], [c.id, 10]]);
  const token = typeof code === "string" && typeof contact === "string" ? await findForCustomer(code.slice(0, 20), contact.slice(0, 120)) : null;
  if (!token) {
    await fail();
    throw new AccountError("No encontramos ese pedido. Revisa el código y el email o teléfono con el que compraste.", 404);
  }
  return linkByToken(c, token);
}
export async function linkByToken(c: Customer, token: unknown) {
  const [o] = await query("select id,customer_id from orders where token=$1 and channel='web' and status not in ('awaiting_payment','abandoned')", [String(token ?? "")]);
  if (o?.customer_id === c.id) return;
  if (!o || o.customer_id || !(await linkOrderRow(o.id, c.id))) throw new AccountError("Este pedido no se puede añadir a tu cuenta.", 409);
}
export const customerOrders = (id: string) =>
  query("select * from orders where customer_id=$1 and status not in ('awaiting_payment','abandoned') order by created_at desc limit 100", [id]);

// ---------- Perfil ----------
export async function updateProfile(c: Customer, b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const phone = normalizePhone(b.phone);
  if (phone && !/^[6-9]\d{8}$/.test(phone)) throw new AccountError("Escribe un teléfono español de 9 cifras.", 422);
  const marketing = b.marketing === true;
  await query("update customers set name=$2, phone=$3, marketing=$4, marketing_at=case when $4 and not marketing then now() when not $4 then null else marketing_at end, updated_at=now() where id=$1", [
    c.id, name || null, phone || null, marketing,
  ]);
}
export const addresses = (id: string) => query("select id,line,postal_code,city,note from customer_addresses where customer_id=$1 order by id", [id]);
export async function addAddress(c: Customer, b: Record<string, unknown>) {
  const line = String(b.line ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const cp = normalizePostalCode(b.postalCode);
  const city = zoneFor(cp);
  if (line.length < 5) throw new AccountError("Escribe calle, número y piso.", 422);
  if (!city) throw new AccountError("De momento repartimos en Pozuelo de Alarcón y Aravaca.", 422);
  const [{ n }] = await query("select count(*)::int as n from customer_addresses where customer_id=$1", [c.id]);
  if (n >= 5) throw new AccountError("Puedes guardar hasta 5 direcciones.", 409);
  await query("insert into customer_addresses (customer_id,line,postal_code,city,note) values ($1,$2,$3,$4,$5)", [c.id, line, cp, city, String(b.note ?? "").trim().slice(0, 160) || null]);
}
export const removeAddress = (c: Customer, id: unknown) => query("delete from customer_addresses where customer_id=$1 and id=$2", [c.id, Math.floor(Number(id)) || 0]);

export async function favoriteIds(id: string) {
  return (await query("select product_id from customer_favorites where customer_id=$1 order by at", [id])).map((r) => r.product_id as string);
}
/** Une los favoritos del navegador con los de la cuenta. */
export async function mergeFavorites(c: Customer, ids: unknown) {
  const ok = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && Boolean(getProductById(x))).slice(0, 200);
  for (const id of ok) await query("insert into customer_favorites (customer_id,product_id) values ($1,$2) on conflict do nothing", [c.id, id]);
  return favoriteIds(c.id);
}
export async function setFavorite(c: Customer, id: unknown, on: unknown) {
  if (typeof id !== "string" || !getProductById(id)) return;
  if (on) await query("insert into customer_favorites (customer_id,product_id) values ($1,$2) on conflict do nothing", [c.id, id]);
  else await query("delete from customer_favorites where customer_id=$1 and product_id=$2", [c.id, id]);
}

export async function exportData(c: Customer) {
  const orders = await customerOrders(c.id);
  const items = orders.length ? await query("select order_id,name,unit,quantity from order_items where order_id = any($1::text[])", [orders.map((o) => o.id)]) : [];
  return {
    perfil: c,
    direcciones: await addresses(c.id),
    favoritos: await favoriteIds(c.id),
    pedidos: orders.map((o: Row) => ({
      codigo: o.code, fecha: o.created_at, estado: o.status, pago: o.payment_status, total_eur: o.total / 100, entrega: o.delivery,
      nombre: o.customer_name, email: o.email, telefono: o.phone, direccion: o.address, codigo_postal: o.postal_code, ciudad: o.city,
      articulos: items.filter((i) => i.order_id === o.id).map((i) => ({ nombre: i.name, unidades: i.quantity, precio_eur: i.unit / 100 })),
    })),
  };
}

/** Borra el perfil. Los pedidos que la ley obliga a conservar quedan sin vínculo con él. */
export async function deleteAccount(c: Customer, password: unknown) {
  const fail = await throttle("borrar", [[c.id, 8]]);
  const [row] = await query("select password_hash from customers where id=$1", [c.id]);
  if (row.password_hash && !(typeof password === "string" && (await checkPassword(password.slice(0, 128), row.password_hash)))) {
    await fail();
    throw new AccountError("La contraseña no es correcta.", 401);
  }
  await tx(async (q) => {
    await q("update orders set customer_id=null, linked_at=null where customer_id=$1", [c.id]);
    await q("delete from customers where id=$1", [c.id]);
  });
  (await cookies()).set(COOKIE, "", { path: "/", maxAge: 0 });
}
