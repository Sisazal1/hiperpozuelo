import Link from "next/link";
import Shell from "@/components/backoffice/Shell";
import { ActionForm } from "@/components/backoffice/forms";
import { requireStaff } from "@/lib/server/auth";
import { listOrders, viewCounts } from "@/lib/server/orders";
import { DELIVERY_LABEL, MODE_LABEL, PAYMENT_LABEL, STATUS_LABEL, euros, type Delivery, type OrderStatus, type PaymentMode, type PaymentStatus } from "@/lib/orders/status";
import { findAction } from "../actions";

const VIEWS = [
  ["", "Todos"],
  ["activos", "En curso"],
  ["cobrar", "Por cobrar"],
  ["verificar", "Por verificar"],
  ["devoluciones", "Desistimientos"],
  ["revisar", "Revisar"],
  ["cerrados", "Cerrados"],
  ["abandonados", "Sin pagar"],
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ vista?: string; q?: string }> }) {
  const staff = await requireStaff();
  const { vista = "", q = "" } = await searchParams;
  const [orders, counts] = await Promise.all([listOrders({ view: vista, q }), viewCounts()]);
  return (
    <Shell staff={staff} current="/backoffice/pedidos" title="Pedidos">
      <div className="bo-tools">
        <form className="bo-search" role="search">
          <input type="hidden" name="vista" value={vista} />
          <label>
            Buscar
            <input name="q" defaultValue={q} placeholder="Código, cliente, teléfono, nº de pago o seguimiento" />
          </label>
          <button className="bo-btn is-plain">Buscar</button>
        </form>
        <ActionForm action={findAction} submit="Abrir" tone="plain" className="is-inline" hideOk>
          <label>
            Código del QR
            <input name="code" placeholder="HP-" autoComplete="off" required />
          </label>
        </ActionForm>
      </div>
      <nav className="bo-tabs" aria-label="Filtros">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={v ? `/backoffice/pedidos?vista=${v}` : "/backoffice/pedidos"} aria-current={v === vista ? "page" : undefined}>
            {label}
            {counts[v] ? <b>{counts[v]}</b> : null}
          </Link>
        ))}
      </nav>
      {orders.length ? (
        <div className="bo-scroll" tabIndex={0} role="region" aria-label="Lista de pedidos">
          <table className="bo-table bo-orders">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Seguimiento</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/backoffice/pedidos/${o.id}`}>{o.code}</Link>
                    <small>{new Date(o.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
                  </td>
                  <td>
                    {o.customer_name ?? "Mostrador"}
                    {o.postal_code && <small>{o.postal_code}</small>}
                  </td>
                  <td>{DELIVERY_LABEL[o.delivery as Delivery]}</td>
                  <td>
                    <span className="bo-pill" data-s={o.status}>
                      {STATUS_LABEL[o.status as OrderStatus]}
                    </span>
                    {o.withdrawal_at && o.status !== "returned" && <small className="bo-warn">Desistimiento</small>}
                    {o.review_reason && <small className="bo-warn">Revisar</small>}
                  </td>
                  <td>
                    <span className="bo-pill" data-p={o.payment_status}>
                      {PAYMENT_LABEL[o.payment_status as PaymentStatus]}
                    </span>
                    <small>{MODE_LABEL[o.payment_mode as PaymentMode]}</small>
                  </td>
                  <td className="mono">{o.tracking_number ?? "—"}</td>
                  <td className="num">{euros(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="bo-empty">No hay pedidos en esta vista.</p>
      )}
    </Shell>
  );
}
