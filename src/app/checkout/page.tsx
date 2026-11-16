"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ShieldCheck, Store } from "lucide-react";
import { useStore, type CartLine } from "@/state/store";
import { getBundleById } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { commerceConfig } from "@/config/commerce";
import { cartSummary, lineTotal } from "@/lib/cart/totals";
import { useTweenedNumber } from "@/components/motion/hooks";
import ProductVisual from "@/components/catalog/ProductVisual";
import { siteConfig } from "@/config/site";
import { saveLocalOrder } from "@/lib/orders";
type Delivery = "delivery" | "collect";
type PaidOrder = {
  id: string;
  amount_total: number | null;
  customer_email: string | null;
  payment_status: string;
  payment_method_types?: string[];
  shipping?: {
    address?: { line1?: string | null; postal_code?: string | null; city?: string | null } | null;
  } | null;
  line_items: { description: string | null; quantity: number | null; amount_total: number | null }[];
};
export default function CheckoutPage() {
  const store = useStore();
  const [delivery, setDelivery] = useState<Delivery>("delivery");
  const [error, setError] = useState("");
  const [paid, setPaid] = useState<PaidOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const creating = useRef(false);
  const totals = cartSummary(store.cart, store.discountCode, delivery);
  const discount = totals.discount;
  const animatedTotal = useTweenedNumber(totals.finalTotal);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("session_id");
    if (p.get("canceled") === "1") setError("Pago cancelado. Tu cesta sigue intacta.");
    if (!id) return;
    fetch(`/api/checkout?session_id=${encodeURIComponent(id)}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.payment_status === "paid") {
          setPaid(d);
          saveLocalOrder({
            id: d.id,
            createdAt: new Date().toISOString(),
            amount: (d.amount_total || 0) / 100,
            items: (d.line_items || []).reduce((n: number, l: { quantity: number | null }) => n + (l.quantity || 0), 0),
            delivery: d.shipping ? "delivery" : "collect",
          });
          store.clearCart();
          localStorage.removeItem("hp-checkout-draft");
        } else setError("No hemos podido confirmar el pago. Tu cesta sigue intacta.");
      })
      .catch(() => setError("No hemos podido confirmar el pago. Tu cesta sigue intacta."));
  }, [store.clearCart]);
  const pay = async () => {
    if (creating.current || !store.cart.length) return;
    creating.current = true;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: store.cart, delivery, discountCode: store.discountCode }),
      });
      const d = await r.json();
      if (!r.ok || !d.url) {
        setError(
          d.error === "payment_unavailable"
            ? "El pago no está disponible ahora mismo. Tu cesta se ha conservado."
            : "No hemos podido iniciar el pago.",
        );
        return;
      }
      location.assign(d.url);
    } catch {
      setError("No hemos podido iniciar el pago. Tu cesta se ha conservado.");
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
  if (!store.hydrated)
    return (
      <div className="checkout-page">
        <div className="skeleton-block" style={{ height: 320, maxWidth: 1100, margin: "48px auto" }} aria-hidden="true" />
        <h1 className="sr-only">Revisa tu cesta</h1>
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
      </div>
    );
  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <span>
          <ShieldCheck size={16} /> Pago seguro con Stripe
        </span>
        <Link href="/cart">Volver al carrito</Link>
      </header>
      <div className="checkout-single">
        <section className="checkout-order-review">
          <span className="eyebrow">Tu pedido</span>
          <h1>Revisa tu cesta</h1>
          {store.cart.map((line) => (
            <CheckoutLine key={line.lineId} line={line} />
          ))}
        </section>
        <aside className="checkout-sidebar">
          <span className="eyebrow">Entrega</span>
          <div className="delivery-choice" role="radiogroup" aria-label="Método de entrega">
            {(
              [
                ["delivery", "Envío a domicilio", totals.subtotal ? (cartSummary(store.cart, store.discountCode, "delivery").shippingCost ? formatEuroPrice(commerceConfig.standardShippingFee) : "Gratis") : "", null],
                ["collect", "Recogida en tienda", commerceConfig.collectionFee ? formatEuroPrice(commerceConfig.collectionFee) : "Gratis", Store],
              ] as const
            ).map(([value, label, price, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={delivery === value}
                className={delivery === value ? "selected" : ""}
                onClick={() => setDelivery(value)}
                onKeyDown={(e) => {
                  if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) {
                    e.preventDefault();
                    const next = value === "delivery" ? "collect" : "delivery";
                    setDelivery(next);
                    (e.currentTarget.parentElement?.querySelector(`[data-value="${next}"]`) as HTMLElement | null)?.focus();
                  }
                }}
                tabIndex={delivery === value ? 0 : -1}
                data-value={value}
              >
                <span className="radio-dot" aria-hidden="true" />
                <strong>
                  {Icon && <Icon size={16} />} {label}
                </strong>
                <span>{price}</span>
              </button>
            ))}
          </div>
          {delivery === "collect" && siteConfig.collection && (
            <p className="checkout-info">
              {siteConfig.collection}
              {siteConfig.openingHours ? ` · ${siteConfig.openingHours}` : ""}
            </p>
          )}
          <div className="checkout-breakdown">
            <div>
              <span>Subtotal</span>
              <strong>{formatEuroPrice(totals.subtotal)}</strong>
            </div>
            {discount > 0 && (
              <div>
                <span>Descuento {store.discountCode}</span>
                <strong>-{formatEuroPrice(discount)}</strong>
              </div>
            )}
            <div>
              <span>Entrega</span>
              <strong>{totals.shippingCost ? formatEuroPrice(totals.shippingCost) : "Gratis"}</strong>
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatEuroPrice(animatedTotal)}</strong>
            </div>
          </div>
          <button className={`summary-cta checkout-pay ${loading ? "is-loading" : ""}`} onClick={pay} disabled={loading} aria-busy={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? "Conectando con Stripe…" : `Pagar ${formatEuroPrice(totals.finalTotal)}`}
            <ChevronRight size={18} />
          </button>
          <p className="checkout-trust">
            <ShieldCheck size={15} /> Compra sin crear cuenta · Pago seguro con Stripe
          </p>
          {siteConfig.prelaunch && (
            <p className="checkout-test-note">Preapertura: pasarela en modo prueba, no se cobra nada. Tarjeta de prueba 4242 4242 4242 4242.</p>
          )}
        </aside>
      </div>
      {error && (
        <div className="checkout-error" role="alert">
          {error}
          {error.includes("confirmar") && (
            <>
              <br />
              <Link href="/cart">Volver al carrito</Link>
            </>
          )}
        </div>
      )}
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
  const a = order.shipping?.address;
  return (
    <div className="confirmation">
      <div className="success-icon">
        <Check />
      </div>
      <span className="eyebrow">Pedido confirmado</span>
      <h1>Gracias por tu compra</h1>
      <p>
        Número de pedido: <strong>{order.id}</strong>
      </p>
      <div className="confirmation-card">
        <div>
          <span>Importe</span>
          <strong>{formatEuroPrice((order.amount_total || 0) / 100)}</strong>
        </div>
        <div>
          <span>Método</span>
          <strong>{order.payment_method_types?.join(", ") || "Stripe"}</strong>
        </div>
        <div>
          <span>Entrega</span>
          <strong>
            {a ? `${a.line1 || ""}, ${a.postal_code || ""} ${a.city || ""}` : "Recogida en tienda"}
          </strong>
        </div>
      </div>
      <div className="confirmation-items">
        <h2>Resumen</h2>
        {order.line_items.map((i, n) => (
          <div className="checkout-review-line" key={`${i.description}-${n}`}>
            <strong>{i.description}</strong>
            <span>
              {i.quantity} × {formatEuroPrice((i.amount_total || 0) / 100)}
            </span>
          </div>
        ))}
      </div>
      <Link href="/" className="btn btn-primary">
        Volver a inicio
      </Link>
    </div>
  );
}
