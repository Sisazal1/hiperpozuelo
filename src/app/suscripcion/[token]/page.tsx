import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/server/db";
import { currentCustomer } from "@/lib/server/customers";
import { SUB_LABEL, getSubscription, subItems, subscriptionOrders, subscriptionsEnabled, syncSession } from "@/lib/server/subscriptions";
import { stripeClient } from "@/lib/server/stripe";
import { subscriptionQuote, weeksLabel } from "@/config/subscription";
import { STATUS_LABEL, euros, type OrderStatus } from "@/lib/orders/status";
import Manage from "@/components/subscription/Manage";
import "@/components/subscription/subscription.css";
import "../../account/account.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu suscripción", robots: { index: false, follow: false }, referrer: "no-referrer" };

const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
const DONE: Record<string, string> = {
  skip: "Próximo ciclo saltado. No se cobrará.",
  pause: "Suscripción en pausa. No se cobra nada mientras dure.",
  resume: "Suscripción reanudada.",
  change: "Cambios guardados. Se aplican desde el próximo ciclo.",
  cancel: "Suscripción cancelada. No habrá más cobros.",
  link: "Suscripción añadida a tu cuenta.",
};

export default async function SubscriptionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string; hecho?: string }> }) {
  const { token } = await params;
  const p = await searchParams;
  if (!subscriptionsEnabled() || !/^[\w-]{20,40}$/.test(token)) notFound();
  // Vuelta de Stripe: confirma sin esperar al webhook. Solo con la sesión de esta suscripción.
  if (p.session_id) {
    const [pending] = await query("select stripe_session_id from subscriptions where token=$1 and status='pending'", [token]);
    if (pending?.stripe_session_id === p.session_id) {
      const session = await stripeClient()!.checkout.sessions.retrieve(p.session_id!).catch(() => null);
      if (session?.status === "complete") await syncSession(session).catch((e) => console.error("subscription sync", (e as Error).message));
    }
  }
  const s = await getSubscription(token);
  if (!s) notFound();
  const [items, orders, customer] = await Promise.all([subItems(s.id), subscriptionOrders(s.id), currentCustomer()]);
  const quote = subscriptionQuote(items, s.delivery);
  return (
    <div className="acc sub-page">
      <header className="acc-head">
        <h1>Tu suscripción</h1>
        {p.session_id && (
          <p className="acc-note" role="status">
            Suscripción confirmada. Guarda este enlace: desde aquí la gestionas y la cancelas.
          </p>
        )}
        {p.hecho && DONE[p.hecho] && (
          <p className="acc-note" role="status">
            {DONE[p.hecho]}
          </p>
        )}
        {s.status === "past_due" && (
          <p className="field-error" role="alert">
            El último cobro no se completó. Revisa tu tarjeta en «Tarjeta y facturas».
          </p>
        )}
      </header>
      <div className="acc-cols">
        <section aria-labelledby="s-res">
          <h2 id="s-res">{SUB_LABEL[s.status]}</h2>
          <dl className="refill-terms">
            <div>
              <dt>Por ciclo</dt>
              <dd>{euros(quote.total)}</dd>
            </div>
            <div>
              <dt>Frecuencia</dt>
              <dd>{weeksLabel(s.weeks)}</dd>
            </div>
            {s.next_cycle_at && s.status === "active" && (
              <div>
                <dt>Próximo cobro</dt>
                <dd>{day(s.next_cycle_at)}</dd>
              </div>
            )}
            <div>
              <dt>Entrega</dt>
              <dd>{s.delivery === "collect" ? "Recogida gratis en tienda" : `${s.address}, ${s.postal_code} ${s.city}`}</dd>
            </div>
          </dl>
          <ul className="refill-lines">
            {items.map((i) => (
              <li key={i.id}>
                <span>
                  {i.n} × {i.name}
                </span>
                <b>{euros(i.unit * i.n)}</b>
              </li>
            ))}
            <li>
              <span>Descuento de suscripción</span>
              <b>-{euros(quote.discount)}</b>
            </li>
            {quote.shipping > 0 && (
              <li>
                <span>Envío</span>
                <b>{euros(quote.shipping)}</b>
              </li>
            )}
          </ul>
        </section>
        <Manage token={token} status={s.status} items={items.map(({ id, n }) => ({ id, n }))} weeks={s.weeks} delivery={s.delivery} canLink={Boolean(customer && !s.customer_id)} />
      </div>
      <section className="acc-block" aria-labelledby="s-ped">
        <h2 id="s-ped">Pedidos de esta suscripción</h2>
        {orders.length ? (
          <ul className="acc-orders">
            {orders.map((o) => (
              <li key={o.code}>
                <div>
                  <strong>
                    {o.code} · {STATUS_LABEL[o.status as OrderStatus]}
                  </strong>
                  <p>
                    {day(o.created_at)} · {euros(o.total)}
                  </p>
                </div>
                <Link className="text-link" href={`/pedido/${o.token}`}>
                  Ver seguimiento
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>El primer pedido aparece aquí en cuanto se confirma el cobro.</p>
        )}
      </section>
    </div>
  );
}
