import "server-only";
import { randomUUID } from "node:crypto";
import { pointsConfig, pointsFor } from "@/config/points";
import { stripeIsTest } from "./stripe";
import { query, tx, type Exec, type Row } from "./db";

// Libro de movimientos: solo se añaden filas. El saldo se calcula sumándolas, nunca se edita.
// earn/refund dependen del pedido (pendientes hasta 14 días tras la entrega); el resto cuenta al momento.
export class PointsError extends Error {}

/** Lo hecho con Stripe en test y lo hecho con cobros reales no se mezclan: se ve y se usa solo lo del modo actual. */
export const pointsTestMode = stripeIsTest;

const MATURE = `(o.delivered_at is not null and o.delivered_at + interval '${pointsConfig.maturityDays} days' <= now())`;
async function balances(q: Exec, customerId: string, test = pointsTestMode()) {
  const [r] = await q(
    `select coalesce(sum(l.points) filter (where l.type not in ('earn','refund') or ${MATURE}),0)::int as available,
            coalesce(sum(l.points) filter (where l.type in ('earn','refund') and not ${MATURE}),0)::int as pending
     from points_ledger l left join orders o on o.id=l.order_id where l.customer_id=$1 and l.test=$2`,
    [customerId, test],
  );
  return r as { available: number; pending: number };
}

/** Última compra pagada; sin compras, el primer movimiento. Desde ahí corren los meses de caducidad. */
async function expiryOf(q: Exec, customerId: string, test = pointsTestMode()): Promise<Date | null> {
  const [r] = await q(
    `select coalesce(
       (select max(created_at) from orders where customer_id=$1 and test=$2 and payment_status in ('collected','verified','partially_refunded') and status not in ('awaiting_payment','abandoned','cancelled')),
       (select min(at) from points_ledger where customer_id=$1 and test=$2)
     ) + interval '${pointsConfig.expiryMonths} months' as at`,
    [customerId, test],
  );
  return r?.at ? new Date(r.at) : null;
}
/** Se llama con la cuenta bloqueada. */
async function expireIfDue(q: Exec, customerId: string, test = pointsTestMode()) {
  const at = await expiryOf(q, customerId, test);
  if (!at || at.getTime() > Date.now()) return;
  const { available } = await balances(q, customerId, test);
  if (available <= 0) return;
  await q("insert into points_ledger (customer_id,type,points,test,reason,actor,ref) values ($1,'expire',$2,$3,$4,'Sistema',$5) on conflict (ref) do nothing", [
    customerId, -available, test, `${pointsConfig.expiryMonths} meses sin compras`, `expire:${customerId}:${at.toISOString()}:${test}`,
  ]);
}
const lock = (q: Exec, customerId: string) => q("select id from customers where id=$1 for update", [customerId]);

export async function pointsState(customerId: string) {
  return tx(async (q) => {
    await lock(q, customerId);
    await expireIfDue(q, customerId);
    const b = await balances(q, customerId);
    const history = await q(
      `select l.type,l.points,l.at,l.reason,o.code, (l.type='earn' and o.payment_status<>'refunded' and o.status not in ('cancelled','returned') and not ${MATURE}) as pending, o.delivered_at
       from points_ledger l left join orders o on o.id=l.order_id where l.customer_id=$1 and l.test=$2 order by l.id desc limit 50`,
      [customerId, pointsTestMode()],
    );
    const at = b.available > 0 ? await expiryOf(q, customerId) : null;
    return { ...b, expiresAt: at?.toISOString() ?? null, history };
  });
}

/** Canje: con la cuenta bloqueada, para que dos a la vez no gasten los mismos puntos. Se llama dentro de la creación del pedido. */
export async function redeemFor(q: Exec, customerId: string, test: boolean, requestKey: string | null | undefined, insertOrder: () => Promise<Row>): Promise<Row> {
  await lock(q, customerId);
  if (requestKey) {
    const [dup] = await q("select * from orders where request_key=$1", [requestKey]);
    if (dup) return dup;
  }
  await expireIfDue(q, customerId, test);
  const { available } = await balances(q, customerId, test);
  if (available < pointsConfig.reward.points) throw new PointsError("No tienes puntos suficientes para canjear.");
  const order = await insertOrder();
  await q("update orders set points_redeemed=$2 where id=$1", [order.id, pointsConfig.reward.points]);
  await settlePoints(q, order.id);
  return order;
}

/**
 * Deja los movimientos de un pedido como corresponde a su estado actual. Idempotente: se puede llamar las veces que haga falta
 * (webhook repetido, vuelta del pago, cambio de estado, reembolso, vinculación). Se llama con el pedido bloqueado.
 */
export async function settlePoints(q: Exec, orderId: string) {
  const [o] = await q("select * from orders where id=$1 for update", [orderId]);
  if (!o?.customer_id || o.channel !== "web") return;
  const rows = await q("select customer_id,type,points from points_ledger where order_id=$1", [orderId]);
  // Una sola vez por pedido: si ya sumó en otra cuenta, aunque se haya eliminado, no vuelve a sumar.
  if (rows.some((r) => r.customer_id !== o.customer_id)) return;
  const sum = (types: string[]) => rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + r.points, 0);
  const add = async (type: string, points: number, reason: string) => {
    const n = rows.filter((r) => r.type === type).length;
    await q("insert into points_ledger (customer_id,order_id,type,points,test,reason,actor,ref) values ($1,$2,$3,$4,$5,$6,'Sistema',$7) on conflict (ref) do nothing", [
      o.customer_id, orderId, type, points, o.test, reason, `${type}:${orderId}${n ? `:${n}` : ""}`,
    ]);
  };

  // Canje: vale mientras el pedido siga vivo.
  const alive = !["cancelled", "abandoned"].includes(o.status) && !["failed", "refunded"].includes(o.payment_status);
  const wantRedeem = alive ? -(o.points_redeemed || 0) : 0;
  const hasRedeem = sum(["redeem", "release"]);
  if (wantRedeem < hasRedeem) await add("redeem", wantRedeem - hasRedeem, "Canje en tu pedido");
  else if (wantRedeem > hasRedeem) await add("release", wantRedeem - hasRedeem, "Canje devuelto");

  // Puntos ganados.
  const paid = ["collected", "verified", "partially_refunded", "refunded"].includes(o.payment_status);
  const inTime = !o.linked_at || new Date(o.linked_at).getTime() <= new Date(o.created_at).getTime() + pointsConfig.linkDays * 86400_000;
  const gross = pointsFor(o.subtotal - o.discount);
  let want = 0;
  if (paid && inTime && !["cancelled", "returned", "abandoned"].includes(o.status)) {
    const [{ back }] = await q("select coalesce(sum(amount),0)::int as back from payments where order_id=$1 and kind='refund'", [orderId]);
    want = gross - Math.round(gross * (o.total > 0 ? Math.min(1, back / o.total) : 0));
  }
  const has = sum(["earn", "refund"]);
  if (want > has) await add("earn", want - has, "Compra");
  else if (want < has) await add("refund", want - has, "Devolución");
}

export async function adjustPoints(customerId: string, points: number, reason: string, staff: string) {
  if (!Number.isInteger(points) || !points || Math.abs(points) > 5000) throw new PointsError("Escribe un número entero de puntos, distinto de cero.");
  if (reason.trim().length < 5) throw new PointsError("Escribe el motivo: queda registrado.");
  await tx(async (q) => {
    await lock(q, customerId);
    const { available } = await balances(q, customerId);
    if (available + points < 0) throw new PointsError(`El saldo disponible es ${available}: no puede quedar negativo.`);
    await q("insert into points_ledger (customer_id,type,points,test,reason,actor,ref) values ($1,'adjust',$2,$3,$4,$5,$6)", [customerId, points, pointsTestMode(), reason.trim().slice(0, 200), staff, `adjust:${randomUUID()}`]);
  });
}

export const findCustomers = (term: string) =>
  query("select id,email,name from customers where lower(email) like $1 or lower(coalesce(name,'')) like $1 order by created_at desc limit 20", [`%${term.trim().toLowerCase()}%`]);
export const ledgerOf = (customerId: string) =>
  query("select l.*, o.code from points_ledger l left join orders o on o.id=l.order_id where l.customer_id=$1 order by l.id desc limit 200", [customerId]);
