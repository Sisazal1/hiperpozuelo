"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, CreditCard, HandCoins, ShieldCheck, Store, Truck } from "lucide-react";
import { useStore, type CartLine } from "@/state/store";
import { getBundleById } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { commerceConfig, ordersEnabled, paymentRules, zoneFor } from "@/config/commerce";
import { cartSummary, lineTotal } from "@/lib/cart/totals";
import { useTweenedNumber } from "@/components/motion/hooks";
import ProductVisual from "@/components/catalog/ProductVisual";
import PaymentMarks, { methodNames, usePaymentMethods } from "@/components/orders/PaymentMarks";
import { siteConfig } from "@/config/site";
import { saveLocalOrder } from "@/lib/orders";
import { track } from "@/lib/track";
import { pointsConfig, pointsLabel } from "@/config/points";
import PointsNote from "@/components/points/PointsNote";
import { hasAccountFlag } from "@/lib/account-client";
import { ClaimOrder } from "@/components/account/forms";
import "../account/account.css";

type Delivery = "delivery" | "collect";
type Payment = "online" | "later";
type Form = { name: string; email: string; phone: string; line: string; postalCode: string; note: string };
type PaidOrder = {
  id: string;
  code: string | null;
  token: string | null;
  owned?: boolean;
  points?: number;
  payment_reference: string | null;
  amount_total: number | null;
  customer_email: string | null;
  payment_status: string;
  payment_method: string;
  wallet: string | null;
  delivery: Delivery;
  shipping: { line1?: string | null; postal_code?: string | null; city?: string | null } | null;
  line_items: { description: string | null; quantity: number | null; amount_total: number | null }[];
};
const EMPTY: Form = { name: "", email: "", phone: "", line: "", postalCode: "", note: "" };
const DRAFT = "hp-checkout-draft";
const METHOD: Record<string, string> = { card: "Tarjeta", klarna: "Klarna", link: "Link", bizum: "Bizum", paypal: "PayPal" };
const WALLET: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay" };

export default function CheckoutPage() {
  const store = useStore();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery>("delivery");
  const [payment, setPayment] = useState<Payment>("online");
  const [form, setForm] = useState<Form>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState("");
  const [paid, setPaid] = useState<PaidOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const creating = useRef(false);
  const requestKey = useRef("");
  const counted = useRef(false);
  const methods = usePaymentMethods();
  const [points, setPoints] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const cartSub = cartSummary(store.cart).subtotal;
  const canRedeem = points !== null && points >= pointsConfig.reward.points && cartSub >= pointsConfig.minSubtotal && !store.discountCode;
  const redeeming = usePoints && canRedeem;
  const totals = cartSummary(store.cart, store.discountCode, delivery, redeeming ? pointsConfig.reward.euros : 0);
  const surcharge = payment === "later" && delivery === "delivery" ? paymentRules.codSurcharge : 0;
  const total = totals.finalTotal + surcharge;
  const animatedTotal = useTweenedNumber(total);
  const codTooHigh = delivery === "delivery" && total > paymentRules.codMax;
  const laterOk = Boolean(methods?.later) && !codTooHigh;
  const zone = zoneFor(form.postalCode);

  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) || "null");
      if (d?.form) setForm({ ...EMPTY, ...d.form });
      if (d?.delivery === "collect") setDelivery("collect");
    } catch {}
    // Con sesión, rellena lo que esté vacío. Sin sesión no se pregunta nada.
    if (!hasAccountFlag()) return;
    fetch("/api/account/me")
      .then((r) => r.json())
      .then(({ customer: c, addresses, points: p }) => {
        if (!c) return;
        setPoints(typeof p === "number" ? p : null);
        const a = addresses?.[0];
        setForm((f) => ({
          name: f.name || c.name || "",
          email: f.email || c.email || "",
          phone: f.phone || c.phone || "",
          line: f.line || a?.line || "",
          postalCode: f.postalCode || a?.postal_code || "",
          note: f.note || a?.note || "",
        }));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ form, delivery }));
    } catch {}
  }, [form, delivery]);
  useEffect(() => {
    if (payment === "later" && methods && !laterOk) setPayment("online");
  }, [payment, methods, laterOk]);
  useEffect(() => {
    if (store.hydrated && store.cart.length && !counted.current && !location.search.includes("session_id")) {
      counted.current = true;
      track("checkout_start");
    }
  }, [store.hydrated, store.cart.length]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("session_id");
    if (p.get("canceled") === "1") setError("Pago cancelado: no se ha cobrado nada y tu cesta sigue intacta. Puedes intentarlo otra vez o elegir otra forma de pago.");
    if (!id) return;
    setConfirming(true);
    fetch(`/api/checkout?session_id=${encodeURIComponent(id)}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: PaidOrder | null) => {
        if (d?.payment_status !== "paid") throw new Error("unpaid");
        setPaid(d);
        saveLocalOrder({
          id: d.id,
          code: d.code ?? undefined,
          token: d.token ?? undefined,
          createdAt: new Date().toISOString(),
          amount: (d.amount_total || 0) / 100,
          items: (d.line_items || []).reduce((n, l) => n + (l.quantity || 0), 0),
          delivery: d.delivery,
        });
        store.clearCart();
        store.removeDiscountCode();
        sessionStorage.removeItem(DRAFT);
      })
      .catch(() => setError("No hemos podido confirmar el pago. Tu cesta sigue intacta: si tu banco muestra un cargo, escríbenos antes de repetirlo."))
      .finally(() => setConfirming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "postalCode" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(({ [k]: _, ...rest }) => rest);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating.current || !store.cart.length) return;
    creating.current = true;
    setLoading(true);
    setError("");
    setFieldErrors({});
    requestKey.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: store.cart,
          delivery,
          payment,
          discountCode: store.discountCode,
          usePoints: redeeming,
          customer: { name: form.name, email: form.email, phone: form.phone },
          address: { line: form.line, postalCode: form.postalCode, note: form.note },
          requestKey: requestKey.current,
        }),
      });
      const d = await r.json();
      if (d.url) {
        track("payment_start");
        location.assign(d.url);
        return;
      }
      if (d.order) {
        track("payment_start");
        saveLocalOrder({
          id: d.order,
          token: d.order,
          createdAt: new Date().toISOString(),
          amount: total,
          items: store.cartCount,
          delivery,
        });
        store.clearCart();
        store.removeDiscountCode();
        sessionStorage.removeItem(DRAFT);
        router.push(`/pedido/${d.order}?nuevo=1`);
        return;
      }
      requestKey.current = "";
      if (d.error === "invalid_fields") {
        setFieldErrors(d.fields);
        const first = Object.keys(d.fields)[0];
        document.getElementById(`co-${first}`)?.focus();
        return;
      }
      const messages: Record<string, string> = {
        payment_unavailable: "El pago online no está disponible ahora mismo. Tu cesta se ha conservado.",
        later_unavailable: "El pago al recibir no está disponible ahora mismo. Puedes pagar online.",
        cod_limit: `El contra reembolso llega hasta ${formatEuroPrice(paymentRules.codMax)}. Paga online o recoge en tienda.`,
        points_balance: "Ya no tienes puntos suficientes. Desmarca el canje para continuar.",
        points_min: `Los puntos se usan desde ${formatEuroPrice(pointsConfig.minSubtotal)} en productos.`,
        points_coupon: "Los puntos no se acumulan con un código de descuento.",
        points_account: "Entra en tu cuenta para usar tus puntos.",
        too_many_open: "Ya tienes pedidos por pagar con este teléfono. Recógelos o paga este online.",
        out_of_stock: `No quedan unidades suficientes: ${(d.items || []).map((i: { name: string; available: number }) => `${i.name} (${i.available})`).join(", ")}. Ajusta la cesta para continuar.`,
      };
      setError(messages[d.error] ?? "No hemos podido iniciar el pago. Tu cesta se ha conservado.");
    } catch {
      setError("No hay conexión con la tienda. Tu cesta se ha conservado.");
    } finally {
      creating.current = false;
      setLoading(false);
    }
  };

  if (paid)
    return (
      <div className="checkout-page">
        <Confirmation order={paid} />
      </div>
    );
  if (!store.hydrated || confirming)
    return (
      <div className="checkout-page">
        <div className="skeleton-block" style={{ height: 320, maxWidth: 1100, margin: "48px auto" }} aria-hidden="true" />
        <h1 className="sr-only">{confirming ? "Confirmando el pago" : "Finalizar compra"}</h1>
      </div>
    );
  if (!store.cart.length)
    return (
      <div className="checkout-page">
        <div className="empty-commerce checkout-empty">
          <h1>No hay productos en tu cesta</h1>
          <Link href="/shop" className="btn btn-primary">
            Explorar la tienda
          </Link>
        </div>
        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`co-field co-field-${k}`}>
      <label htmlFor={`co-${k}`}>{label}</label>
      <input
        id={`co-${k}`}
        value={form[k]}
        onChange={set(k)}
        aria-invalid={Boolean(fieldErrors[k])}
        aria-describedby={fieldErrors[k] ? `co-${k}-err` : undefined}
        {...props}
      />
      {fieldErrors[k] && (
        <p className="field-error" id={`co-${k}-err`} role="alert">
          {fieldErrors[k]}
        </p>
      )}
    </div>
  );

  const shippingPrice = cartSummary(store.cart, store.discountCode, "delivery", redeeming ? pointsConfig.reward.euros : 0).shippingCost;
  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <span>
          <ShieldCheck size={16} aria-hidden="true" /> Pago seguro · compra sin cuenta
        </span>
        <Link href="/cart">Volver a la cesta</Link>
      </header>
      <ol className="co-steps" aria-label="Progreso de la compra">
        <li data-state="done">
          <Check size={14} aria-hidden="true" /> Cesta
        </li>
        <li data-state="current" aria-current="step">
          Entrega y pago
        </li>
        <li>Confirmación</li>
      </ol>
      <form className="checkout-single" onSubmit={submit} noValidate>
        <section className="checkout-order-review co-form">
          <h1>Entrega y pago</h1>

          <fieldset className="co-block">
            <legend>1. Tus datos</legend>
            <div className="co-grid">
              {field("name", "Nombre y apellidos", { autoComplete: "name", required: true })}
              {field("phone", "Teléfono", { type: "tel", inputMode: "tel", autoComplete: "tel", required: true })}
              {field("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", required: true })}
            </div>
          </fieldset>

          <fieldset className="co-block">
            <legend>2. Entrega</legend>
            <div className="co-options">
              <label className="co-option">
                <input type="radio" name="delivery" value="collect" checked={delivery === "collect"} onChange={() => setDelivery("collect")} />
                <span className="co-option-body">
                  <strong>
                    <Store size={17} aria-hidden="true" /> Recogida en tienda
                  </strong>
                  <small>Pozuelo de Alarcón{ordersEnabled ? ", con tu código QR" : ""}</small>
                </span>
                <b>{commerceConfig.collectionFee ? formatEuroPrice(commerceConfig.collectionFee) : "Gratis"}</b>
              </label>
              <label className="co-option">
                <input type="radio" name="delivery" value="delivery" checked={delivery === "delivery"} onChange={() => setDelivery("delivery")} />
                <span className="co-option-body">
                  <strong>
                    <Truck size={17} aria-hidden="true" /> Envío a domicilio
                  </strong>
                  <small>Pozuelo de Alarcón y Aravaca</small>
                </span>
                <b>{shippingPrice ? formatEuroPrice(shippingPrice) : "Gratis"}</b>
              </label>
            </div>
            {delivery === "delivery" && (
              <div className="co-grid co-address">
                {field("postalCode", "Código postal", { inputMode: "numeric", autoComplete: "postal-code", required: true })}
                {field("line", "Calle, número y piso", { autoComplete: "street-address", required: true })}
                {field("note", "Indicaciones para el reparto (opcional)")}
                {form.postalCode.length === 5 && !fieldErrors.postalCode && (
                  <p className={`co-zone ${zone ? "is-ok" : "is-out"}`} role="status">
                    {zone ? (
                      <>
                        <Check size={15} aria-hidden="true" /> Repartimos en {zone}
                      </>
                    ) : (
                      "Aún no repartimos en ese código postal. Puedes recogerlo gratis en tienda."
                    )}
                  </p>
                )}
              </div>
            )}
            {delivery === "collect" && siteConfig.collection && (
              <p className="checkout-info">
                {siteConfig.collection}
                {siteConfig.openingHours ? ` · ${siteConfig.openingHours}` : ""}
              </p>
            )}
          </fieldset>

          <fieldset className="co-block">
            <legend>3. Forma de pago</legend>
            <div className="co-options">
              <label className="co-option">
                <input type="radio" name="payment" value="online" checked={payment === "online"} onChange={() => setPayment("online")} />
                <span className="co-option-body">
                  <strong>
                    <CreditCard size={17} aria-hidden="true" /> Pagar ahora online
                  </strong>
                  {methods && <PaymentMarks keys={methodNames(methods).filter((k) => k !== "klarna" || total >= paymentRules.klarnaMin)} />}
                </span>
              </label>
              {methods?.later && (
                <label className={`co-option ${codTooHigh ? "is-disabled" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="later"
                    checked={payment === "later"}
                    disabled={codTooHigh}
                    onChange={() => setPayment("later")}
                  />
                  <span className="co-option-body">
                    <strong>
                      <HandCoins size={17} aria-hidden="true" /> {delivery === "collect" ? "Pagar al recoger" : "Pagar al recibirlo (contra reembolso)"}
                    </strong>
                    {codTooHigh ? (
                      <small>Disponible hasta {formatEuroPrice(paymentRules.codMax)}.</small>
                    ) : (
                      <>
                        <small>{delivery === "collect" ? "En el mostrador, cuando vengas a por él." : "Al repartidor, en la puerta."}</small>
                        <PaymentMarks keys={["visa", "mastercard", "bizum", "cash"]} label="Formas de pago al recibir" />
                      </>
                    )}
                  </span>
                  {delivery === "delivery" && !codTooHigh && paymentRules.codSurcharge > 0 && <b>+{formatEuroPrice(paymentRules.codSurcharge)}</b>}
                </label>
              )}
            </div>
          </fieldset>
        </section>

        <aside className="checkout-sidebar" aria-label="Resumen del pedido">
          <h2 className="co-summary-title">Tu pedido</h2>
          <div className="co-lines">
            {store.cart.map((line) => (
              <CheckoutLine key={line.lineId} line={line} />
            ))}
          </div>
          <div className="checkout-breakdown">
            <div>
              <span>Subtotal</span>
              <strong>{formatEuroPrice(totals.subtotal)}</strong>
            </div>
            {totals.discount > 0 && (
              <div>
                <span>{redeeming ? `Descuento ${pointsLabel(pointsConfig.reward.points)}` : `Descuento ${store.discountCode}`}</span>
                <strong>-{formatEuroPrice(totals.discount)}</strong>
              </div>
            )}
            <div>
              <span>{delivery === "collect" ? "Recogida" : "Envío"}</span>
              <strong>{totals.shippingCost ? formatEuroPrice(totals.shippingCost) : "Gratis"}</strong>
            </div>
            {surcharge > 0 && (
              <div>
                <span>Contra reembolso</span>
                <strong>{formatEuroPrice(surcharge)}</strong>
              </div>
            )}
            <div className="checkout-total">
              <span>Total, IVA incluido</span>
              <strong>{formatEuroPrice(animatedTotal)}</strong>
            </div>
          </div>
          {points !== null && points >= pointsConfig.reward.points && (
            <label className="pts-redeem">
              <input type="checkbox" checked={redeeming} disabled={!canRedeem} onChange={(e) => setUsePoints(e.target.checked)} />
              <span>
                Usar {pointsLabel(pointsConfig.reward.points)}: {formatEuroPrice(pointsConfig.reward.euros)} menos
                <small>
                  {store.discountCode
                    ? `No se acumula con ${store.discountCode}. Quítalo en la cesta para usar tus puntos.`
                    : cartSub < pointsConfig.minSubtotal
                      ? `Desde ${formatEuroPrice(pointsConfig.minSubtotal)} en productos.`
                      : `Tienes ${pointsLabel(points)}.`}
                </small>
              </span>
            </label>
          )}
          <PointsNote goodsCents={Math.round(totals.discountedSubtotal * 100)} />
          {error && (
            <div className="checkout-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className={`summary-cta checkout-pay ${loading ? "is-loading" : ""}`} disabled={loading} aria-busy={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading
              ? payment === "online"
                ? "Abriendo el pago…"
                : "Confirmando…"
              : payment === "online"
                ? `Pagar ${formatEuroPrice(total)}`
                : "Pedido con obligación de pago"}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <p className="checkout-trust">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
              {payment === "online"
                ? "Pagas en la página cifrada de Stripe. Tu banco puede pedirte confirmarlo."
                : delivery === "collect"
                  ? "Hoy no pagas nada: lo haces al recoger."
                  : "Hoy no pagas nada: lo haces al recibirlo."}{" "}
              <Link href="/pago-seguro">Cómo protegemos tu pago</Link>
            </span>
          </p>
          <p className="co-legal">
            Al continuar aceptas las <Link href="/condiciones">condiciones</Link> y la <Link href="/privacidad">privacidad</Link>. Tienes 14 días para{" "}
            <Link href="/envios-y-devoluciones">devolverlo</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}

function CheckoutLine({ line }: { line: CartLine }) {
  const p = line.type === "product" ? getProductById(line.productId) : undefined;
  const b = line.type === "bundle" ? getBundleById(line.bundleId) : undefined;
  const name = p?.name_es || b?.name_es || "Pack personalizado";
  const categoryId = p?.category_id ?? b?.category_id ?? (line.type === "custom_bundle" ? line.categoryId : undefined) ?? "kitchen";
  return (
    <article className="checkout-review-line">
      <ProductVisual categoryId={categoryId} subcategory={p?.subcategory} image={p?.image} name={name} size="sm" />
      <div>
        <strong>{name}</strong>
        <small>
          {line.type === "product" ? p?.subcategory : "Pack"} · {line.quantity} {line.quantity === 1 ? "unidad" : "unidades"}
        </small>
      </div>
      <b>{formatEuroPrice(lineTotal(line))}</b>
    </article>
  );
}

function Confirmation({ order }: { order: PaidOrder }) {
  const a = order.shipping;
  return (
    <div className="confirmation">
      <div className="success-icon">
        <Check />
      </div>
      <span className="eyebrow">Pago confirmado</span>
      <h1>Gracias por tu compra</h1>
      <p>
        Pedido <strong>{order.code ?? order.id.slice(-8)}</strong>
        {order.payment_reference && (
          <>
            {" "}
            · nº de pago <strong className="mono">{order.payment_reference}</strong>
          </>
        )}
      </p>
      <div className="confirmation-card">
        <div>
          <span>Importe</span>
          <strong>{formatEuroPrice((order.amount_total || 0) / 100)}</strong>
        </div>
        <div>
          <span>Método</span>
          <strong>{(order.wallet && WALLET[order.wallet]) || METHOD[order.payment_method] || "Pago online"}</strong>
        </div>
        <div>
          <span>Entrega</span>
          <strong>{order.delivery === "collect" ? "Recogida en tienda" : a ? `${a.line1 || ""}, ${a.postal_code || ""} ${a.city || ""}` : "Envío a domicilio"}</strong>
        </div>
      </div>
      <div className="confirmation-items">
        <h2>Resumen</h2>
        {order.line_items.map((i, n) => (
          <div className="confirmation-line" key={`${i.description}-${n}`}>
            <span>
              {i.quantity} × {i.description}
            </span>
            <strong>{formatEuroPrice((i.amount_total || 0) / 100)}</strong>
          </div>
        ))}
      </div>
      <div className="confirmation-actions">
        {order.token && (
          <Link href={`/pedido/${order.token}`} className="btn btn-primary">
            Seguir mi pedido
          </Link>
        )}
        <Link href="/shop" className="btn btn-secondary">
          Seguir comprando
        </Link>
      </div>
      {order.token && !order.owned && <ClaimOrder token={order.token} email={order.customer_email} points={order.points} />}
    </div>
  );
}
