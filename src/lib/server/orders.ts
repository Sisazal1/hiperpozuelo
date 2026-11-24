import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { query, tx, type Exec, type Row } from "./db";
import { getBundleById, bundleDisplayName } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { lineQuantity, lineUnitPrice, type PricedLineInput } from "@/lib/cart/totals";
import { calculateDiscount, calculateOrderTotals, commerceConfig, paymentRules, type DeliveryMethod } from "@/config/commerce";
import {
  NEEDS_REFERENCE,
  STATUS_LABEL,
  TENDERS,
  euros,
  nextStatuses,
  type Delivery,
  type OrderStatus,
  type PaymentMode,
  type Tender,
} from "@/lib/orders/status";

export class OrderError extends Error {}

export type PricedLine = {
  kind: "product" | "bundle" | "custom_bundle";
  ref: string;
  name: string;
  unit: number;
  quantity: number;
  components: { id: string; n: number }[];
};

/** El importe nunca viene del navegador: se recalcula desde el catálogo, en céntimos. */
export function priceLines(input: unknown): PricedLine[] | null {
  if (!Array.isArray(input) || !input.length || input.length > 50) return null;
  const out: PricedLine[] = [];
  for (const raw of input) {
    const line = raw as PricedLineInput;
    if (!line || typeof line !== "object") return null;
    const unit = lineUnitPrice(line);
    if (unit === null) return null;
    const base = { unit: Math.round(unit * 100), quantity: lineQuantity(line) };
    if (line.type === "product") {
      const p = getProductById(line.productId!)!;
      out.push({ ...base, kind: "product", ref: p.id, name: p.name_es, components: [{ id: p.id, n: 1 }] });
    } else if (line.type === "bundle") {
      const b = getBundleById(line.bundleId!)!;
      out.push({ ...base, kind: "bundle", ref: b.id, name: bundleDisplayName(b), components: b.product_ids.map((id) => ({ id, n: 1 })) });
    } else {
      const components = (line.productIds || [])
        .map((id) => ({ id, n: Math.max(0, Math.floor(line.quantities?.[id] || 0)) }))
        .filter((c) => c.n > 0);
      out.push({ ...base, kind: "custom_bundle", ref: "custom", name: "Pack personalizado", components });
    }
  }
  return out;
}

export function totalsFor(lines: PricedLine[], delivery: DeliveryMethod, discountCode: string | undefined, mode: PaymentMode) {
  const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);
  const t = calculateOrderTotals(subtotal / 100, delivery, calculateDiscount(subtotal / 100, discountCode));
  const discount = Math.round(t.discount * 100);
  const shipping = Math.round(t.shippingCost * 100);
  const surcharge = mode === "cod" ? Math.round(paymentRules.codSurcharge * 100) : 0;
  return {
    subtotal,
    discount,
    shipping,
    surcharge,
    total: subtotal - discount + shipping + surcharge,
    discountCode: discount > 0 ? commerceConfig.welcomeDiscountCode : null,
  };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "HP-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

async function event(q: Exec, orderId: string, type: string, label: string, actor: string, isPublic = false) {
  await q("insert into order_events (order_id,type,label,actor,public) values ($1,$2,$3,$4,$5)", [orderId, type, label, actor, isPublic]);
}

// ---------- Stock: solo se mueve en productos inventariados; el resto queda «sin inventariar» ----------
async function moveStock(q: Exec, orderId: string, sign: 1 | -1, actor: string, reason: string) {
  const items = await q("select quantity, components from order_items where order_id=$1", [orderId]);
  const need = new Map<string, number>();
  for (const it of items)
    for (const c of it.components as { id: string; n: number }[]) need.set(c.id, (need.get(c.id) || 0) + c.n * it.quantity);
  for (const [id, n] of need) {
    const done = await q("update stock set on_hand = on_hand + $2, updated_at = now() where product_id=$1 returning product_id", [id, sign * n]);
    if (done.length)
      await q("insert into stock_moves (product_id,delta,reason,actor,order_id) values ($1,$2,$3,$4,$5)", [id, sign * n, reason, actor, orderId]);
  }
  await q("update orders set stock_taken=$2 where id=$1", [orderId, sign === -1]);
}

/** Productos inventariados sin unidades suficientes para estas líneas. */
export async function shortages(lines: PricedLine[], q: Exec = query) {
  const need = new Map<string, number>();
  for (const l of lines) for (const c of l.components) need.set(c.id, (need.get(c.id) || 0) + c.n * l.quantity);
  const rows = await q("select product_id, on_hand from stock where product_id = any($1::text[])", [[...need.keys()]]);
  return rows
    .filter((r) => r.on_hand < (need.get(r.product_id) || 0))
    .map((r) => ({ id: r.product_id as string, name: getProductById(r.product_id)?.name_es ?? r.product_id, available: Math.max(0, r.on_hand) }));
}

export type NewOrder = {
  channel: "web" | "pos";
  mode: PaymentMode;
  delivery: Delivery;
  lines: PricedLine[];
  totals: ReturnType<typeof totalsFor>;
  customer?: { name?: string; email?: string; phone?: string };
  address?: { line?: string; postalCode?: string; city?: string; note?: string };
  requestKey?: string | null;
  actor: string;
  test: boolean;
};

export function createOrder(o: NewOrder): Promise<Row> {
  return tx((q) => createOrderIn(q, o));
}
async function createOrderIn(q: Exec, o: NewOrder): Promise<Row> {
    if (o.requestKey) {
      const [dup] = await q("select * from orders where request_key=$1", [o.requestKey]);
      if (dup) return dup;
    }
    const status: OrderStatus = o.mode === "online" ? "awaiting_payment" : o.channel === "pos" ? "delivered" : "received";
    const [row] = await q(
      `insert into orders (id,code,token,channel,status,payment_mode,payment_status,delivery,customer_name,email,phone,address,postal_code,city,delivery_note,
         subtotal,discount,shipping,surcharge,total,discount_code,request_key,test,delivered_at)
       values ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) returning *`,
      [
        randomUUID(), newCode(), randomBytes(18).toString("base64url"), o.channel, status, o.mode, o.delivery,
        o.customer?.name || null, o.customer?.email || null, o.customer?.phone || null,
        o.address?.line || null, o.address?.postalCode || null, o.address?.city || null, o.address?.note || null,
        o.totals.subtotal, o.totals.discount, o.totals.shipping, o.totals.surcharge, o.totals.total, o.totals.discountCode,
        o.requestKey || null, o.test, status === "delivered" ? new Date().toISOString() : null,
      ],
    );
    for (const l of o.lines)
      await q("insert into order_items (order_id,kind,ref,name,unit,quantity,components) values ($1,$2,$3,$4,$5,$6,$7::jsonb)", [
        row.id, l.kind, l.ref, l.name, l.unit, l.quantity, JSON.stringify(l.components),
      ]);
    if (status === "awaiting_payment") await event(q, row.id, "created", "Pedido iniciado, esperando el pago online", o.actor);
    else {
      await event(q, row.id, "created", status === "delivered" ? "Venta en mostrador" : "Pedido recibido", o.actor, true);
      await moveStock(q, row.id, -1, o.actor, "venta");
    }
    return row;
}

export async function attachSession(orderId: string, sessionId: string) {
  await query("update orders set stripe_session_id=$2, updated_at=now() where id=$1", [orderId, sessionId]);
}

/** Idempotente: lo llaman el webhook y la vuelta del cliente; gana quien llegue primero. */
export async function markPaidOnline(sessionId: string, paymentIntent: string, amount: number, review?: string | null) {
  return tx(async (q) => {
    const [o] = await q("select * from orders where stripe_session_id=$1 for update", [sessionId]);
    if (!o) return null;
    if (o.payment_status !== "pending" && o.payment_status !== "failed") return o;
    const mismatch = amount !== o.total ? `Importe cobrado ${euros(amount)} distinto del pedido ${euros(o.total)}` : null;
    const reason = [mismatch, review].filter(Boolean).join(" · ") || null;
    await q(
      `insert into payments (order_id,kind,method,amount,reference,status,recorded_by,verified_by,verified_at)
       values ($1,'charge','stripe',$2,$3,'verified','Stripe','Stripe',now()) on conflict do nothing`,
      [o.id, amount, paymentIntent],
    );
    const [u] = await q(
      `update orders set payment_status='verified', status=case when status in ('awaiting_payment','abandoned') then 'received' else status end,
         stripe_payment_intent=$2, review_reason=$3, updated_at=now() where id=$1 returning *`,
      [o.id, paymentIntent, reason],
    );
    await event(q, o.id, "paid", "Pago confirmado", "Stripe", true);
    if (reason) await event(q, o.id, "review", `Revisar antes de preparar: ${reason}`, "Sistema");
    if (!o.stock_taken) await moveStock(q, o.id, -1, "Stripe", "venta");
    return u;
  });
}

export async function markSession(sessionId: string, kind: "failed" | "expired") {
  await tx(async (q) => {
    const [o] = await q("select * from orders where stripe_session_id=$1 for update", [sessionId]);
    if (!o || o.payment_status === "verified") return;
    if (kind === "failed") {
      await q("update orders set payment_status='failed', updated_at=now() where id=$1", [o.id]);
      await event(q, o.id, "payment_failed", "El pago no se completó", "Stripe");
    } else if (o.status === "awaiting_payment") {
      await q("update orders set status='abandoned', updated_at=now() where id=$1", [o.id]);
      await event(q, o.id, "abandoned", "El pago caducó sin completarse", "Stripe");
    }
  });
}

export async function flagByPaymentIntent(pi: string, label: string, type: "review" | "dispute") {
  await tx(async (q) => {
    const [o] = await q("select * from orders where stripe_payment_intent=$1 for update", [pi]);
    if (!o) return;
    await q("update orders set review_reason=$2, updated_at=now() where id=$1", [o.id, label]);
    await event(q, o.id, type, label, "Stripe");
  });
}

export async function syncRefund(pi: string, refunded: number) {
  await tx(async (q) => {
    const [o] = await q("select * from orders where stripe_payment_intent=$1 for update", [pi]);
    if (!o) return;
    const [{ done }] = await q("select coalesce(sum(amount),0)::int as done from payments where order_id=$1 and kind='refund'", [o.id]);
    const delta = refunded - done;
    if (delta <= 0) return;
    await q(
      "insert into payments (order_id,kind,method,amount,reference,status,recorded_by,verified_by,verified_at) values ($1,'refund','stripe',$2,$3,'verified','Stripe','Stripe',now())",
      [o.id, delta, `${pi}#${refunded}`],
    );
    await q("update orders set payment_status=$2, updated_at=now() where id=$1", [o.id, refunded >= o.total ? "refunded" : "partially_refunded"]);
    await event(q, o.id, "refunded", `Reembolso de ${euros(delta)} en tu método de pago`, "Stripe", true);
  });
}

// ---------- Acciones del equipo ----------
export async function setStatus(orderId: string, to: OrderStatus, actor: string) {
  return tx(async (q) => {
    const [o] = await q("select * from orders where id=$1 for update", [orderId]);
    if (!o) throw new OrderError("Pedido no encontrado.");
    if (!nextStatuses(o.status, o.delivery).includes(to)) throw new OrderError(`No se puede pasar de «${STATUS_LABEL[o.status as OrderStatus]}» a «${STATUS_LABEL[to]}».`);
    if (["preparing", "ready", "shipped"].includes(to) && o.payment_mode === "online" && o.payment_status !== "verified")
      throw new OrderError("Este pedido se paga online y el pago no está verificado.");
    if (["preparing", "ready", "shipped"].includes(to) && o.review_reason) throw new OrderError("El pedido está en revisión: resuélvela antes de seguir.");
    if (to === "shipped" && !o.courier) throw new OrderError("Asigna un transportista antes de enviarlo.");
    if (to === "shipped" && o.courier !== "propio" && !o.tracking_number) throw new OrderError("Añade el número de seguimiento antes de enviarlo.");
    if (to === "delivered" && o.payment_mode !== "cod" && !["collected", "verified"].includes(o.payment_status))
      throw new OrderError("No se entrega sin cobrar: registra el pago primero.");
    if (to === "delivered" && o.payment_mode === "cod" && o.payment_status === "pending")
      throw new OrderError("Contra reembolso: registra el cobro del repartidor antes de marcarlo entregado.");
    if (to === "cancelled" && ["collected", "verified"].includes(o.payment_status))
      throw new OrderError("El pedido está cobrado: reembólsalo antes de cancelarlo.");
    await q("update orders set status=$2, updated_at=now(), delivered_at=case when $2='delivered' then now() else delivered_at end where id=$1", [orderId, to]);
    const label: Partial<Record<OrderStatus, string>> = {
      preparing: "Estamos preparando tu pedido",
      ready: "Tu pedido está listo para recoger",
      shipped: "Tu pedido ha salido a reparto",
      delivered: "Pedido entregado",
      cancelled: "Pedido cancelado",
      returned: "Devolución recibida",
    };
    await event(q, orderId, to, label[to] ?? STATUS_LABEL[to], actor, true);
    if ((to === "cancelled" || to === "returned") && o.stock_taken) await moveStock(q, orderId, 1, actor, to === "returned" ? "devolución" : "cancelación");
  });
}

export async function setShipping(orderId: string, courier: string, tracking: string, actor: string, courierName: string) {
  const t = tracking.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
  await tx(async (q) => {
    const [o] = await q("update orders set courier=$2, tracking_number=$3, updated_at=now() where id=$1 and delivery='delivery' and status in ('received','preparing','shipped') returning id", [orderId, courier, t || null]);
    if (!o) throw new OrderError("Este pedido no admite cambios de transporte.");
    await event(q, orderId, "courier", t ? `Transporte: ${courierName}, seguimiento ${t}` : `Transporte: ${courierName}`, actor, true);
  });
}

async function recordChargeIn(q: Exec, o: Row, tender: Tender, reference: string, actor: string) {
  const ref = reference.trim().slice(0, 60) || null;
  if (!["pending", "failed"].includes(o.payment_status)) throw new OrderError("Este pedido ya tiene el cobro registrado.");
  if (["cancelled", "abandoned", "returned"].includes(o.status)) throw new OrderError("El pedido está cerrado.");
  if (tender === "courier" && o.payment_mode !== "cod") throw new OrderError("La liquidación del courier es solo para contra reembolso.");
  if (tender === "stripe") throw new OrderError("Los pagos de Stripe se registran solos.");
  if (NEEDS_REFERENCE.includes(tender) && !ref) throw new OrderError(`Falta el número de operación de ${TENDERS[tender]}.`);
  if (ref) {
    const [dup] = await q(
      "select o.code from payments p join orders o on o.id=p.order_id where p.kind='charge' and p.method=$1 and p.reference=$2",
      [tender, ref],
    );
    if (dup) throw new OrderError(`Ese número de operación ya está usado en ${dup.code}.`);
  }
  // Efectivo: se verifica al contarlo en el cierre de caja; el resto, al casarlo con el banco.
  await q("insert into payments (order_id,kind,method,amount,reference,status,recorded_by) values ($1,'charge',$2,$3,$4,'collected',$5)", [o.id, tender, o.total, ref, actor]);
  await q("update orders set payment_status='collected', status=case when status='awaiting_payment' then 'received' else status end, updated_at=now() where id=$1", [o.id]);
  await event(q, o.id, "collected", `Pago recibido: ${TENDERS[tender]}`, actor, true);
}

export async function recordCharge(orderId: string, tender: Tender, reference: string, actor: string) {
  await tx(async (q) => {
    const [o] = await q("select * from orders where id=$1 for update", [orderId]);
    if (!o) throw new OrderError("Pedido no encontrado.");
    if (o.payment_mode === "online") throw new OrderError("Este pedido se paga online.");
    await recordChargeIn(q, o, tender, reference, actor);
  });
}

export async function verifyPayment(paymentId: number, actor: string) {
  await tx(async (q) => {
    const [p] = await q("select * from payments where id=$1 for update", [paymentId]);
    if (!p || p.status !== "collected") throw new OrderError("No hay ningún cobro por verificar.");
    await q("update payments set status='verified', verified_by=$2, verified_at=now() where id=$1", [paymentId, actor]);
    await q("update orders set payment_status=case when payment_status='collected' then 'verified' else payment_status end, updated_at=now() where id=$1", [p.order_id]);
    await event(q, p.order_id, "verified", `Cobro verificado: ${TENDERS[p.method as Tender]}${p.reference ? ` nº ${p.reference}` : ""}`, actor);
  });
}

export async function rejectPayment(paymentId: number, actor: string) {
  await tx(async (q) => {
    const [p] = await q("select * from payments where id=$1 for update", [paymentId]);
    if (!p || p.status !== "collected") throw new OrderError("No hay ningún cobro por verificar.");
    const [back] = await q("select 1 from payments where order_id=$1 and kind='refund'", [p.order_id]);
    if (back) throw new OrderError("Ese cobro ya tiene un reembolso registrado.");
    await q("update payments set status='rejected', verified_by=$2, verified_at=now(), reference=case when reference is null then null else reference || ' (rechazado ' || id || ')' end where id=$1", [paymentId, actor]);
    await q("update orders set payment_status='pending', review_reason='Cobro rechazado en la verificación', updated_at=now() where id=$1", [p.order_id]);
    await event(q, p.order_id, "rejected", `Cobro rechazado: ${TENDERS[p.method as Tender]}${p.reference ? ` nº ${p.reference}` : ""}`, actor);
  });
}

/** Reembolso hecho fuera de Stripe (efectivo, Bizum o TPV físico): solo deja constancia. */
export async function recordRefund(orderId: string, cents: number, tender: Tender, reference: string, actor: string) {
  await tx(async (q) => {
    const [o] = await q("select * from orders where id=$1 for update", [orderId]);
    if (!o) throw new OrderError("Pedido no encontrado.");
    if (o.payment_mode === "online") throw new OrderError("Los pagos online se reembolsan desde Stripe; aquí se refleja solo.");
    if (tender === "courier" || tender === "stripe") throw new OrderError("Elige cómo devuelves el dinero.");
    if (NEEDS_REFERENCE.includes(tender) && !reference.trim()) throw new OrderError("Falta el número de operación del reembolso.");
    const [{ paid, back }] = await q(
      "select coalesce(sum(amount) filter (where kind='charge' and status<>'rejected'),0)::int as paid, coalesce(sum(amount) filter (where kind='refund'),0)::int as back from payments where order_id=$1",
      [orderId],
    );
    if (!Number.isInteger(cents) || cents <= 0 || cents > paid - back) throw new OrderError(`El máximo reembolsable es ${euros(paid - back)}.`);
    await q(
      "insert into payments (order_id,kind,method,amount,reference,status,recorded_by,verified_by,verified_at) values ($1,'refund',$2,$3,$4,'verified',$5,$5,now())",
      [orderId, tender, cents, reference.trim().slice(0, 60) || null, actor],
    );
    await q("update orders set payment_status=$2, updated_at=now() where id=$1", [orderId, back + cents >= paid ? "refunded" : "partially_refunded"]);
    await event(q, orderId, "refunded", `Reembolso de ${euros(cents)}`, actor, true);
  });
}

export async function clearReview(orderId: string, actor: string) {
  await tx(async (q) => {
    await q("update orders set review_reason=null, updated_at=now() where id=$1", [orderId]);
    await event(q, orderId, "review_ok", "Revisión resuelta", actor);
  });
}

export async function addNote(orderId: string, note: string, actor: string) {
  const n = note.trim().slice(0, 400);
  if (n) await event(query, orderId, "note", n, actor);
}

/** Venta en mostrador: pedido, cobro y salida de stock en el mismo paso. */
export async function posSale(lines: PricedLine[], tender: Tender, reference: string, actor: string, requestKey: string) {
  const totals = totalsFor(lines, "collect", undefined, "pos");
  if (NEEDS_REFERENCE.includes(tender) && !reference.trim()) throw new OrderError(`Falta el número de operación de ${TENDERS[tender]}.`);
  // Una sola transacción: si el cobro no se puede registrar, no queda venta ni salida de stock.
  return tx(async (q) => {
    const order = await createOrderIn(q, { channel: "pos", mode: "pos", delivery: "counter", lines, totals, requestKey, actor, test: false });
    if (order.payment_status === "pending") await recordChargeIn(q, order, tender, reference, actor);
    return order;
  });
}

// ---------- Lectura ----------
export async function getOrder(id: string) {
  const [o] = await query("select * from orders where id=$1", [id]);
  return o ? withDetail(o) : null;
}
export async function getOrderByToken(token: string) {
  const [o] = await query("select * from orders where token=$1", [token]);
  return o ? withDetail(o) : null;
}
async function withDetail(o: Row) {
  const [items, payments, events] = await Promise.all([
    query("select * from order_items where order_id=$1 order by id", [o.id]),
    query("select * from payments where order_id=$1 order by id", [o.id]),
    query("select * from order_events where order_id=$1 order by id desc", [o.id]),
  ]);
  return { order: o, items, payments, events };
}

export const normalizePhone = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("34") ? d.slice(2) : d;
};

export async function findForCustomer(code: string, contact: string) {
  const [o] = await query("select * from orders where code=$1 and channel='web' and status not in ('awaiting_payment','abandoned')", [code.trim().toUpperCase()]);
  if (!o) return null;
  const c = contact.trim().toLowerCase();
  const phone = normalizePhone(c);
  return c && (c === o.email || (phone.length >= 9 && phone === o.phone)) ? (o.token as string) : null;
}

export async function openUnpaid(phone: string) {
  const [{ n }] = await query(
    "select count(*)::int as n from orders where phone=$1 and payment_mode in ('pickup','cod') and payment_status='pending' and status in ('received','preparing','ready','shipped')",
    [phone],
  );
  return n as number;
}

export async function listOrders(f: { view?: string; q?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  const views: Record<string, string> = {
    activos: "status in ('received','preparing','ready','shipped')",
    verificar: "payment_status='collected'",
    cobrar: "payment_status='pending' and status in ('received','preparing','ready','shipped')",
    devoluciones: "(withdrawal_at is not null and status <> 'returned')",
    revisar: "review_reason is not null",
    cerrados: "status in ('delivered','cancelled','returned')",
    abandonados: "status in ('awaiting_payment','abandoned')",
  };
  where.push(views[f.view ?? ""] ?? "status not in ('awaiting_payment','abandoned')");
  if (f.q) {
    params.push(`%${f.q.trim().toLowerCase()}%`);
    where.push("(lower(code) like $1 or lower(coalesce(customer_name,'')) like $1 or coalesce(phone,'') like $1 or lower(coalesce(email,'')) like $1 or lower(coalesce(tracking_number,'')) like $1 or exists (select 1 from payments p where p.order_id=orders.id and lower(coalesce(p.reference,'')) like $1))");
  }
  return query(`select * from orders where ${where.join(" and ")} order by created_at desc limit 200`, params);
}

export async function viewCounts() {
  const [r] = await query(`select
    count(*) filter (where status in ('received','preparing','ready','shipped'))::int as activos,
    count(*) filter (where payment_status='collected')::int as verificar,
    count(*) filter (where payment_status='pending' and status in ('received','preparing','ready','shipped'))::int as cobrar,
    count(*) filter (where withdrawal_at is not null and status <> 'returned')::int as devoluciones,
    count(*) filter (where review_reason is not null)::int as revisar from orders`);
  return r as Record<string, number>;
}

// ---------- Desistimiento ----------
export function withdrawalDeadline(o: Row): Date | null {
  if (!o.delivered_at) return null;
  return new Date(new Date(o.delivered_at).getTime() + 14 * 86400_000);
}
export function canWithdraw(o: Row) {
  if (o.channel !== "web" || o.withdrawal_at || ["cancelled", "returned", "abandoned", "awaiting_payment"].includes(o.status)) return false;
  const d = withdrawalDeadline(o);
  return !d || d.getTime() > Date.now();
}
export async function withdraw(token: string, contact: string) {
  return tx(async (q) => {
    const [o] = await q("select * from orders where token=$1 for update", [token]);
    if (!o) throw new OrderError("Pedido no encontrado.");
    const c = contact.trim().toLowerCase();
    if (!c || (c !== o.email && normalizePhone(c) !== o.phone)) throw new OrderError("El email o teléfono no coincide con el del pedido.");
    if (!canWithdraw(o)) throw new OrderError("Este pedido ya no admite desistimiento.");
    const ref = "DES-" + randomBytes(4).toString("hex").toUpperCase();
    const [u] = await q("update orders set withdrawal_at=now(), withdrawal_ref=$2, updated_at=now() where id=$1 returning *", [o.id, ref]);
    await event(q, o.id, "withdrawal", `Has desistido de la compra (${ref})`, "Cliente", true);
    return u;
  });
}

// ---------- Embudo agregado (sin cookies ni identificadores) y KPIs ----------
export const FUNNEL = ["visit", "product_view", "add_to_cart", "checkout_start", "payment_start"] as const;
export async function countFunnel(name: string) {
  await query("insert into funnel (day,name,n) values (current_date,$1,1) on conflict (day,name) do update set n = funnel.n + 1", [name]);
}

export async function kpis(days: number) {
  const since = `now() - interval '${Math.max(1, Math.min(365, Math.floor(days)))} days'`;
  const funnelRows = await query(`select name, sum(n)::int as n from funnel where day >= (${since})::date group by name`);
  const funnel = Object.fromEntries(FUNNEL.map((k) => [k, funnelRows.find((r) => r.name === k)?.n ?? 0])) as Record<(typeof FUNNEL)[number], number>;
  const [w] = await query(`select
      count(*) filter (where status not in ('awaiting_payment','abandoned','cancelled'))::int as orders,
      coalesce(sum(total) filter (where payment_status in ('collected','verified','partially_refunded')),0)::int as revenue,
      count(*) filter (where payment_status in ('collected','verified','partially_refunded','refunded'))::int as paid,
      coalesce(sum(shipping) filter (where status not in ('awaiting_payment','abandoned','cancelled')),0)::int as shipping,
      count(*) filter (where status in ('awaiting_payment','abandoned'))::int as unfinished,
      count(*) filter (where withdrawal_at is not null or status='returned')::int as returned,
      count(*) filter (where status='delivered')::int as delivered
    from orders where channel='web' and created_at >= ${since}`);
  const [p] = await query(`select count(*)::int as orders, coalesce(sum(total),0)::int as revenue from orders where channel='pos' and created_at >= ${since}`);
  const [r] = await query(`select count(*)::int as customers, count(*) filter (where c > 1)::int as repeaters from (
      select coalesce(email,phone) as k, count(*) as c from orders where channel='web' and coalesce(email,phone) is not null
        and status not in ('awaiting_payment','abandoned','cancelled') and created_at >= ${since} group by 1) t`);
  const [ref] = await query(`select coalesce(sum(amount),0)::int as refunds from payments where kind='refund' and created_at >= ${since}`);
  const byMode = await query(`select payment_mode as k, count(*)::int as n, coalesce(sum(total),0)::int as total from orders
      where status not in ('awaiting_payment','abandoned','cancelled') and created_at >= ${since} group by 1 order by 3 desc`);
  const byTender = await query(`select method as k, count(*)::int as n, coalesce(sum(amount),0)::int as total from payments
      where kind='charge' and status<>'rejected' and created_at >= ${since} group by 1 order by 3 desc`);
  const byDay = await query(`select to_char(created_at at time zone 'Europe/Madrid','YYYY-MM-DD') as d, count(*)::int as n, coalesce(sum(total),0)::int as total
      from orders where status not in ('awaiting_payment','abandoned','cancelled') and created_at >= ${since} group by 1 order by 1`);
  return { funnel, web: w, pos: p, repeat: r, refunds: ref.refunds as number, byMode, byTender, byDay };
}

/** Cierre de caja del día (hora de Madrid) por medio de cobro. */
export async function tillToday() {
  return query(`select p.method as k, count(*)::int as n, coalesce(sum(case when p.kind='charge' then p.amount else -p.amount end),0)::int as total,
      count(*) filter (where p.status='collected')::int as to_verify
    from payments p where p.status<>'rejected' and p.method<>'stripe'
      and (p.created_at at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date group by 1 order by 1`);
}

// ---------- Inventario ----------
export async function stockMap() {
  const rows = await query("select product_id, on_hand from stock");
  return new Map(rows.map((r) => [r.product_id as string, r.on_hand as number]));
}
export async function setStock(productId: string, units: number, actor: string) {
  if (!getProductById(productId) || !Number.isInteger(units) || units < 0 || units > 99999) throw new OrderError("Cantidad no válida.");
  await tx(async (q) => {
    const [prev] = await q("select on_hand from stock where product_id=$1", [productId]);
    await q(
      "insert into stock (product_id,on_hand,updated_by) values ($1,$2,$3) on conflict (product_id) do update set on_hand=$2, updated_by=$3, updated_at=now()",
      [productId, units, actor],
    );
    await q("insert into stock_moves (product_id,delta,reason,actor) values ($1,$2,'recuento',$3)", [productId, units - (prev?.on_hand ?? 0), actor]);
  });
}
