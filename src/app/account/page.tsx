import Link from "next/link";
import QRCode from "qrcode";
import { PackageSearch } from "lucide-react";
import { ordersEnabled } from "@/config/commerce";
import { dbAvailable } from "@/lib/server/db";
import { addresses, currentCustomer, customerOrders, favoriteIds, type Customer } from "@/lib/server/customers";
import { SUB_LABEL, customerSubscriptions } from "@/lib/server/subscriptions";
import { weeksLabel } from "@/config/subscription";
import { googleEnabled } from "@/lib/server/google";
import { getProductById } from "@/lib/catalog/products";
import { STATUS_LABEL, courierById, euros, publicPaymentLabel, type OrderStatus, type PaymentMode, type PaymentStatus } from "@/lib/orders/status";
import LocalOrders from "@/components/account/LocalOrders";
import { AccountSync, DeleteAccount, LinkOrder, LinkToken, NewAddress, Password, Profile, RemoveAddress, SignIn, SignOut, SignOutAll, SignUp } from "@/components/account/forms";
import "./account.css";

export const dynamic = "force-dynamic";
type Params = { pedido?: string; google?: string; eliminada?: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });

export default async function AccountPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const on = ordersEnabled && dbAvailable();
  const customer = on ? await currentCustomer() : null;
  const pending = typeof p.pedido === "string" && /^[\w-]{20,40}$/.test(p.pedido) ? p.pedido : null;
  return <div className="acc">{customer ? <Home c={customer} pending={pending} /> : <Guest on={on} p={p} />}</div>;
}

function Guest({ on, p }: { on: boolean; p: Params }) {
  return (
    <>
      <header className="acc-head">
        <h1>Tu cuenta es opcional.</h1>
        <p>Compra sin cuenta cuando quieras. Con cuenta tienes tus pedidos, direcciones y favoritos en cualquier dispositivo.</p>
        {p.eliminada && (
          <p className="acc-note" role="status">
            Tu cuenta está eliminada.
          </p>
        )}
        {p.google && (
          <p className="field-error" role="alert">
            {p.google === "existe" ? "Ya hay una cuenta con ese email. Entra con tu contraseña." : "No se ha podido entrar con Google."}
          </p>
        )}
      </header>
      {on && (
        <div className="acc-cols">
          <section aria-labelledby="a-in">
            <h2 id="a-in">Entrar</h2>
            <SignIn google={googleEnabled()} />
          </section>
          <section aria-labelledby="a-up">
            <h2 id="a-up">Crear cuenta</h2>
            <SignUp />
          </section>
        </div>
      )}
      <section className="acc-block" aria-labelledby="a-loc">
        <div className="acc-block-head">
          <h2 id="a-loc">Pedidos en este dispositivo</h2>
          {on && (
            <Link className="text-link" href="/pedido">
              <PackageSearch size={18} aria-hidden="true" /> Seguir un pedido sin cuenta
            </Link>
          )}
        </div>
        <LocalOrders />
      </section>
    </>
  );
}

async function Home({ c, pending }: { c: Customer; pending: string | null }) {
  const [orders, addr, favs, subs] = await Promise.all([customerOrders(c.id), addresses(c.id), favoriteIds(c.id), customerSubscriptions(c.id)]);
  const qrs = new Map<string, string>();
  for (const o of orders)
    if (o.delivery === "collect" && ["received", "preparing", "ready"].includes(o.status)) qrs.set(o.id, await QRCode.toString(o.code, { type: "svg", margin: 0, errorCorrectionLevel: "M" }));
  return (
    <>
      <AccountSync />
      <header className="acc-head acc-head-row">
        <div>
          <h1>{c.name ? `Hola, ${c.name.split(" ")[0]}` : "Tu cuenta"}</h1>
          <p>{c.email}</p>
        </div>
        <SignOut />
      </header>

      {pending && (
        <section className="acc-block" aria-labelledby="a-pend">
          <h2 id="a-pend">Añade tu último pedido</h2>
          <p>Lo has abierto desde su enlace de seguimiento, así que puedes guardarlo aquí.</p>
          <LinkToken token={pending} />
        </section>
      )}

      <section className="acc-block" aria-labelledby="a-ord">
        <h2 id="a-ord">Pedidos</h2>
        {orders.length ? (
          <ul className="acc-orders">
            {orders.map((o) => {
              const courier = courierById(o.courier);
              return (
                <li key={o.id}>
                  <div>
                    <strong>
                      {o.code} · {STATUS_LABEL[o.status as OrderStatus]}
                    </strong>
                    <p>
                      {day(o.created_at)} · {euros(o.total)} · {publicPaymentLabel(o.payment_status as PaymentStatus, o.payment_mode as PaymentMode)}
                    </p>
                    {o.tracking_number && (
                      <p>
                        {courier?.name} <span className="mono">{o.tracking_number}</span>
                      </p>
                    )}
                    <Link className="text-link" href={`/pedido/${o.token}`}>
                      Ver seguimiento
                    </Link>
                  </div>
                  {qrs.has(o.id) && (
                    <figure className="order-qr">
                      <div dangerouslySetInnerHTML={{ __html: qrs.get(o.id)! }} role="img" aria-label={`Código QR del pedido ${o.code}`} />
                      <figcaption>Para recogerlo</figcaption>
                    </figure>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="acc-empty">
            Todavía no hay pedidos en tu cuenta. <Link href="/packs">Ver los packs</Link>
          </p>
        )}
        <details className="acc-more">
          <summary>Añadir un pedido hecho sin cuenta</summary>
          <p>Escribe el código y el email o teléfono que usaste. También puedes abrir su enlace de seguimiento y guardarlo desde allí.</p>
          <LinkOrder />
        </details>
      </section>

      {subs.length > 0 && (
        <section className="acc-block" aria-labelledby="a-sub">
          <h2 id="a-sub">Suscripciones</h2>
          <ul className="acc-orders">
            {subs.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>
                    Reposición {weeksLabel(s.weeks).toLowerCase()} · {SUB_LABEL[s.status]}
                  </strong>
                  {s.status === "active" && s.next_cycle_at && <p>Próximo cobro: {day(s.next_cycle_at)}</p>}
                </div>
                <Link className="text-link" href={`/suscripcion/${s.token}`}>
                  Gestionar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="acc-block" aria-labelledby="a-fav">
        <h2 id="a-fav">Favoritos</h2>
        {favs.length ? (
          <ul className="acc-favs">
            {favs.map((id) => {
              const prod = getProductById(id);
              return prod ? (
                <li key={id}>
                  <Link href={`/product/${prod.slug}`}>{prod.name_es}</Link>
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="acc-empty">Lo que marques con el corazón se guarda aquí.</p>
        )}
      </section>

      <div className="acc-cols">
        <section aria-labelledby="a-dir">
          <h2 id="a-dir">Direcciones</h2>
          {addr.length > 0 && (
            <ul className="acc-addr">
              {addr.map((a) => (
                <li key={a.id}>
                  <span>
                    {a.line}, {a.postal_code} {a.city}
                    {a.note && <small>{a.note}</small>}
                  </span>
                  <RemoveAddress id={a.id} label={a.line} />
                </li>
              ))}
            </ul>
          )}
          <NewAddress />
        </section>
        <section aria-labelledby="a-dat">
          <h2 id="a-dat">Tus datos</h2>
          <Profile name={c.name} phone={c.phone} marketing={c.marketing} />
        </section>
        <section aria-labelledby="a-seg">
          <h2 id="a-seg">Seguridad</h2>
          <Password has={c.has_password} />
          <SignOutAll />
        </section>
        <section aria-labelledby="a-priv">
          <h2 id="a-priv">Privacidad</h2>
          <p>
            <a className="text-link" href="/api/account/export" download>
              Descargar mis datos
            </a>
          </p>
          <details className="acc-more">
            <summary>Eliminar la cuenta</summary>
            <p>Se borran tu perfil, direcciones y favoritos, y se cancelan tus suscripciones.{" "} Los pedidos que la ley obliga a conservar dejan de estar vinculados a ti en la tienda.</p>
            <DeleteAccount has={c.has_password} />
          </details>
        </section>
      </div>
    </>
  );
}
