import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Check, PackageCheck } from "lucide-react";
import { dbAvailable } from "@/lib/server/db";
import { canWithdraw, getOrderByToken, withdrawalDeadline } from "@/lib/server/orders";
import { MODE_LABEL, STATUS_LABEL, STEPS, courierById, euros, publicPaymentLabel, type Delivery, type OrderStatus, type PaymentMode, type PaymentStatus } from "@/lib/orders/status";
import { currentCustomer } from "@/lib/server/customers";
import { ClaimOrder, LinkToken } from "@/components/account/forms";
import "../../account/account.css";
import WithdrawButton from "@/components/orders/WithdrawButton";
import { pointsConfig, pointsFor } from "@/config/points";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false }, referrer: "no-referrer" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const STEP_COPY: Partial<Record<OrderStatus, string>> = {
  received: "Pedido recibido",
  preparing: "En preparación",
  ready: "Listo para recoger",
  shipped: "En reparto",
  delivered: "Entregado",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { token } = await params;
  if (!dbAvailable() || !/^[\w-]{20,40}$/.test(token)) notFound();
  const data = await getOrderByToken(token);
  if (!data || ["awaiting_payment", "abandoned"].includes(data.order.status)) notFound();
  const { order: o, items, payments, events } = data;
  const customer = await currentCustomer();
  const isNew = (await searchParams).nuevo === "1";
  const delivery = o.delivery as Delivery;
  const steps = STEPS[delivery];
  const at = steps.indexOf(o.status);
  const closed = o.status === "cancelled" || o.status === "returned";
  const courier = courierById(o.courier);
  const track = courier?.track && o.tracking_number ? courier.track(o.tracking_number) : null;
  const qr = delivery === "collect" && !closed && o.status !== "delivered" ? await QRCode.toString(o.code, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;
  const deadline = withdrawalDeadline(o);
  const charge = payments.find((p) => p.kind === "charge" && p.status !== "rejected");

  return (
    <div className="commerce-page order-page">
      <div className="commerce-container">
        {isNew && (
          <p className="order-new" role="status">
            <PackageCheck size={18} aria-hidden="true" /> Pedido confirmado. Guarda este enlace o anota el código.
          </p>
        )}
        <header className="order-head">
          <div>
            <span className="eyebrow">Pedido {o.code}</span>
            <h1>{closed ? STATUS_LABEL[o.status as OrderStatus] : (STEP_COPY[o.status as OrderStatus] ?? STATUS_LABEL[o.status as OrderStatus])}</h1>
            <p>
              {euros(o.total)} · {publicPaymentLabel(o.payment_status as PaymentStatus, o.payment_mode as PaymentMode)}
            </p>
          </div>
          {qr && (
            <figure className="order-qr">
              <div dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`Código QR del pedido ${o.code}`} />
              <figcaption>Enséñalo en el mostrador</figcaption>
            </figure>
          )}
        </header>

        {!closed && (
          <ol className="order-track" aria-label="Estado del pedido" style={{ ["--n" as string]: steps.length }}>
            {steps.map((s, i) => (
              <li key={s} data-state={i < at || o.status === "delivered" ? "done" : i === at ? "current" : "next"} aria-current={i === at ? "step" : undefined}>
                <span className="order-dot" aria-hidden="true">
                  {(i < at || o.status === "delivered") && <Check size={14} />}
                </span>
                {STEP_COPY[s]}
              </li>
            ))}
          </ol>
        )}

        <div className="order-grid">
          <section className="order-box" aria-labelledby="o-det">
            <h2 id="o-det">Detalle</h2>
            <ul className="order-lines">
              {items.map((i) => (
                <li key={i.id}>
                  <span>
                    {i.quantity} × {i.name}
                  </span>
                  <strong>{euros(i.unit * i.quantity)}</strong>
                </li>
              ))}
              {o.discount > 0 && (
                <li>
                  <span>Descuento {o.discount_code}</span>
                  <strong>−{euros(o.discount)}</strong>
                </li>
              )}
              <li>
                <span>{delivery === "delivery" ? "Envío" : "Recogida"}</span>
                <strong>{o.shipping ? euros(o.shipping) : "Gratis"}</strong>
              </li>
              {o.surcharge > 0 && (
                <li>
                  <span>Contra reembolso</span>
                  <strong>{euros(o.surcharge)}</strong>
                </li>
              )}
              <li className="order-sum">
                <span>Total</span>
                <strong>{euros(o.total)}</strong>
              </li>
            </ul>
            <dl className="order-facts">
              <div>
                <dt>Entrega</dt>
                <dd>{delivery === "delivery" ? `Envío a ${o.city ?? "domicilio"}` : "Recogida en tienda"}</dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd>{MODE_LABEL[o.payment_mode as PaymentMode]}</dd>
              </div>
              {charge?.reference && (
                <div>
                  <dt>Nº de pago</dt>
                  <dd className="mono">{charge.reference}</dd>
                </div>
              )}
              {courier && (
                <div>
                  <dt>Transporte</dt>
                  <dd>{courier.name}</dd>
                </div>
              )}
              {o.tracking_number && (
                <div>
                  <dt>Nº de seguimiento</dt>
                  <dd className="mono">
                    {o.tracking_number}
                    {track && (
                      <>
                        {" "}
                        <a href={track} target="_blank" rel="noopener noreferrer">
                          Ver en {courier!.name}
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="order-box" aria-labelledby="o-his">
            <h2 id="o-his">Historial</h2>
            <ol className="order-history">
              {events
                .filter((e) => e.public)
                .map((e) => (
                  <li key={e.id}>
                    <strong>{e.label}</strong>
                    <time dateTime={e.at}>{when(e.at)}</time>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <section className="order-box order-withdraw" aria-labelledby="o-des">
          <h2 id="o-des">Devoluciones</h2>
          {o.withdrawal_at ? (
            <>
              <p>
                Registramos tu desistimiento <strong className="mono">{o.withdrawal_ref}</strong> el {when(o.withdrawal_at)}. Te reembolsamos en el mismo medio de pago en un máximo de 14
                días; podemos esperar a recibir los productos.
              </p>
              <p className="order-hint">Guarda o imprime esta página como justificante.</p>
            </>
          ) : canWithdraw(o) ? (
            <>
              <p>
                {deadline
                  ? `Puedes desistir de la compra hasta el ${deadline.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" })}, sin dar motivos.`
                  : "Puedes desistir de la compra hasta 14 días después de recibirla, sin dar motivos."}
              </p>
              <WithdrawButton token={token} code={o.code} />
            </>
          ) : (
            <p>
              Este pedido ya no admite desistimiento. <Link href="/envios-y-devoluciones">Consulta las condiciones</Link>.
            </p>
          )}
        </section>
        {!o.customer_id && o.channel === "web" && (customer ? <LinkToken token={token} /> : isNew && o.email ? <ClaimOrder token={token} points={Date.now() - new Date(o.created_at).getTime() < pointsConfig.linkDays * 86400_000 ? pointsFor(o.subtotal - o.discount) : 0} /> : null)}
      </div>
    </div>
  );
}
