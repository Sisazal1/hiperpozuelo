import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/backoffice/Shell";
import { ActionForm, TenderFields } from "@/components/backoffice/forms";
import PrintButton from "@/components/backoffice/PrintButton";
import { requireStaff } from "@/lib/server/auth";
import { getOrder } from "@/lib/server/orders";
import { getProductById } from "@/lib/catalog/products";
import {
  COURIERS, DELIVERY_LABEL, MODE_LABEL, PAYMENT_LABEL, STATUS_LABEL, TENDERS, courierById, euros, nextStatuses,
  type Delivery, type OrderStatus, type PaymentMode, type PaymentStatus, type Tender,
} from "@/lib/orders/status";
import { chargeAction, noteAction, refundAction, rejectAction, reviewAction, shippingAction, statusAction, verifyAction } from "../../actions";

const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
const VERB: Partial<Record<OrderStatus, string>> = {
  preparing: "Empezar a preparar", ready: "Marcar listo para recoger", shipped: "Entregar al transportista",
  delivered: "Marcar entregado", cancelled: "Cancelar pedido", returned: "Recibida la devolución",
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const data = /^[0-9a-f-]{36}$/.test(id) ? await getOrder(id) : null;
  if (!data) notFound();
  const { order: o, items, payments, events } = data;
  const delivery = o.delivery as Delivery;
  const status = o.status as OrderStatus;
  const next = nextStatuses(status, delivery);
  const offline = o.payment_mode !== "online";
  const toCharge = offline && ["pending", "failed"].includes(o.payment_status) && !["cancelled", "abandoned", "returned"].includes(status);
  const charged = payments.filter((p) => p.kind === "charge" && p.status !== "rejected").reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter((p) => p.kind === "refund").reduce((s, p) => s + p.amount, 0);
  const courier = courierById(o.courier);
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const msg = `Hola, ${String(o.customer_name ?? "").split(" ")[0]}. Tu pedido ${o.code} de Hiper Pozuelo: ${STATUS_LABEL[status].toLowerCase()}.${o.tracking_number ? ` Seguimiento ${courier?.name ?? ""} ${o.tracking_number}.` : ""} Estado: ${base}/pedido/${o.token}`;

  return (
    <Shell
      staff={staff}
      current="/backoffice/pedidos"
      title={o.code}
      aside={
        <div className="bo-head-tags">
          <span className="bo-pill" data-s={status}>{STATUS_LABEL[status]}</span>
          <span className="bo-pill" data-p={o.payment_status}>{PAYMENT_LABEL[o.payment_status as PaymentStatus]}</span>
          <PrintButton />
        </div>
      }
    >
      <p className="bo-back">
        <Link href="/backoffice/pedidos">Todos los pedidos</Link>
      </p>
      {o.review_reason && (
        <div className="bo-alert" role="alert">
          <strong>Revisar antes de seguir:</strong> {o.review_reason}
          <ActionForm action={reviewAction} hidden={{ id }} submit="Revisado" tone="plain" className="is-inline" hideOk />
        </div>
      )}
      {o.withdrawal_at && status !== "returned" && (
        <div className="bo-alert">
          <strong>El cliente ha desistido ({o.withdrawal_ref}, {when(o.withdrawal_at)}).</strong> Hay 14 días para reembolsar; se puede esperar a recibir el producto.
        </div>
      )}
      <div className="bo-detail">
        <div className="bo-col">
          <section className="bo-card">
            <h2>Productos</h2>
            <table className="bo-table">
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.quantity} × {i.name}
                      {i.kind !== "product" && (
                        <ul className="bo-pick">
                          {(i.components as { id: string; n: number }[]).map((c) => (
                            <li key={c.id}>
                              {c.n * i.quantity} × {getProductById(c.id)?.name_es ?? c.id}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="num">{euros(i.unit * i.quantity)}</td>
                  </tr>
                ))}
                {o.discount > 0 && <tr><td>Descuento {o.discount_code}</td><td className="num">−{euros(o.discount)}</td></tr>}
                {delivery !== "counter" && <tr><td>{DELIVERY_LABEL[delivery]}</td><td className="num">{o.shipping ? euros(o.shipping) : "Gratis"}</td></tr>}
                {o.surcharge > 0 && <tr><td>Contra reembolso</td><td className="num">{euros(o.surcharge)}</td></tr>}
                <tr className="bo-total"><td>Total</td><td className="num">{euros(o.total)}</td></tr>
              </tbody>
            </table>
          </section>

          <section className="bo-card">
            <h2>Pagos</h2>
            <p className="bo-note">{MODE_LABEL[o.payment_mode as PaymentMode]}</p>
            {payments.length ? (
              <div className="bo-scroll">
                <table className="bo-table">
                  <thead>
                    <tr><th>Movimiento</th><th>Nº de pago</th><th>Estado</th><th className="num">Importe</th></tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.kind === "refund" ? "Reembolso" : "Cobro"} · {TENDERS[p.method as Tender]}
                          <small>{when(p.created_at)} · {p.recorded_by}</small>
                        </td>
                        <td className="mono">{p.reference ?? "—"}</td>
                        <td>
                          {p.status === "collected" ? (
                            <div className="bo-inline">
                              <ActionForm action={verifyAction} hidden={{ payment: String(p.id) }} submit="Verificar" hideOk />
                              <ActionForm action={rejectAction} hidden={{ payment: String(p.id) }} submit="Rechazar" tone="danger" hideOk />
                            </div>
                          ) : (
                            <>
                              {p.status === "verified" ? "Verificado" : "Rechazado"}
                              <small>{p.verified_by}{p.verified_at ? ` · ${when(p.verified_at)}` : ""}</small>
                            </>
                          )}
                        </td>
                        <td className="num">{p.kind === "refund" ? "−" : ""}{euros(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="bo-empty">Sin cobros todavía.</p>
            )}
            {toCharge && (
              <ActionForm action={chargeAction} hidden={{ id }} submit={`Registrar cobro de ${euros(o.total)}`} className="bo-fields">
                <TenderFields cod={o.payment_mode === "cod"} />
              </ActionForm>
            )}
            {charged - refunded > 0 && offline && (
              <details className="bo-more">
                <summary>Registrar reembolso</summary>
                <ActionForm action={refundAction} hidden={{ id }} submit="Registrar reembolso" tone="danger" className="bo-fields">
                  <label>
                    Importe (€)
                    <input name="amount" inputMode="decimal" defaultValue={((charged - refunded) / 100).toFixed(2).replace(".", ",")} required />
                  </label>
                  <TenderFields refund />
                </ActionForm>
              </details>
            )}
            {o.stripe_payment_intent && (
              <p className="bo-note">
                Reembolsos y disputas: <a href={`https://dashboard.stripe.com/${o.test ? "test/" : ""}payments/${o.stripe_payment_intent}`} target="_blank" rel="noopener noreferrer">abrir en Stripe</a>. Aquí se reflejan solos.
              </p>
            )}
          </section>
        </div>

        <div className="bo-col">
          <section className="bo-card bo-noprint">
            <h2>Siguiente paso</h2>
            <div className="bo-steps">
              {next.length ? (
                next.map((to) => (
                  <ActionForm key={to} action={statusAction} hidden={{ id, to }} submit={VERB[to] ?? STATUS_LABEL[to]} tone={to === "cancelled" || to === "returned" ? "danger" : "primary"} confirm={to === "cancelled" ? "¿Cancelar este pedido?" : undefined} hideOk />
                ))
              ) : (
                <p className="bo-empty">Pedido cerrado.</p>
              )}
            </div>
          </section>
          {delivery === "delivery" && (
            <section className="bo-card">
              <h2>Logística</h2>
              <address className="bo-address">
                {o.customer_name}<br />
                {o.address}<br />
                {o.postal_code} {o.city}
                {o.delivery_note && <><br />Nota: {o.delivery_note}</>}
              </address>
              {courier && <p>{courier.name} {o.tracking_number && <span className="mono">{o.tracking_number}</span>}</p>}
              {["received", "preparing", "shipped"].includes(status) && (
                <ActionForm action={shippingAction} hidden={{ id }} submit="Guardar transporte" tone="plain" className="bo-fields bo-noprint">
                  <label>
                    Transportista
                    <select name="courier" defaultValue={o.courier ?? ""} required>
                      <option value="" disabled>Elegir</option>
                      {COURIERS.filter((c) => o.payment_mode !== "cod" || c.cod).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Nº de seguimiento
                    <input name="tracking" defaultValue={o.tracking_number ?? ""} autoComplete="off" maxLength={40} />
                  </label>
                </ActionForm>
              )}
            </section>
          )}
          {o.channel === "web" && (
            <section className="bo-card bo-noprint">
              <h2>Cliente</h2>
              <p>
                {o.customer_name}<br />
                <a href={`tel:+34${o.phone}`}>{o.phone}</a><br />
                <a href={`mailto:${o.email}`}>{o.email}</a>
              </p>
              <p className="bo-inline">
                <Link className="bo-btn is-plain" href={`/pedido/${o.token}`} target="_blank">Ver como cliente</Link>
                <a className="bo-btn is-plain" href={`https://wa.me/34${o.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Avisar por WhatsApp</a>
              </p>
            </section>
          )}
          <section className="bo-card bo-noprint">
            <h2>Historial</h2>
            <ol className="bo-history">
              {events.map((e) => (
                <li key={e.id}>
                  {e.label}
                  <small>{when(e.at)} · {e.actor}{e.public ? " · visible para el cliente" : ""}</small>
                </li>
              ))}
            </ol>
            <ActionForm key={events.length} action={noteAction} hidden={{ id }} submit="Añadir nota" tone="plain" className="bo-fields" hideOk>
              <label>
                Nota interna
                <input name="note" maxLength={400} required />
              </label>
            </ActionForm>
          </section>
        </div>
      </div>
      <p className="bo-print-foot">Hiper Pozuelo · {o.code} · {when(o.created_at)} · Justificante de compra, sin valor de factura.</p>
    </Shell>
  );
}
