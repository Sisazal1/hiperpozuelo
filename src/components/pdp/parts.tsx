"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Check, Minus, Plus, ShoppingBag, Store, Truck } from "lucide-react";
import { commerceConfig, paymentRules } from "@/config/commerce";
import { useStore } from "@/state/store";
import { cartSummary } from "@/lib/cart/totals";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { getAllBundles, calculateBundleTotal } from "@/lib/catalog/bundles";
import { getAllProducts } from "@/lib/catalog/products";
import { families } from "@/lib/catalog/families";
import { FAQ } from "@/lib/faq";
import PaymentMarks, { methodNames, usePaymentMethods } from "@/components/orders/PaymentMarks";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useAddedFeedback } from "@/components/motion/hooks";
import type { Bundle, Product } from "@/types/catalog";

/** Agotado = inventariado en 0. Si no hay inventario o falla la consulta, no se afirma nada. */
export function useSoldOut() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let on = true;
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : { soldOut: [] }))
      .then((d) => on && setIds(Array.isArray(d.soldOut) ? d.soldOut : []))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  return ids;
}

/** La columna más corta se queda fija; si no cabe en pantalla, se ancla por abajo para no cortarse. */
export function stickyColumn(el: HTMLElement | null) {
  if (!el) return;
  const ro = new ResizeObserver(() => el.style.setProperty("--col-h", `${el.offsetHeight}px`));
  ro.observe(el);
  return () => ro.disconnect();
}

export function Stepper({ value, onChange, label, min = 1, disabled }: { value: number; onChange: (n: number) => void; label: string; min?: number; disabled?: boolean }) {
  return (
    <div className="quantity-control" role="group" aria-label={`Cantidad de ${label}`}>
      <button type="button" aria-label={`Quitar uno: ${label}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={16} />
      </button>
      <span className="qty-value" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={`Añadir uno: ${label}`} disabled={disabled || value >= paymentRules.maxLineQuantity} onClick={() => onChange(Math.min(paymentRules.maxLineQuantity, value + 1))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

/** Solo métodos activos; Klarna desde su mínimo. */
export function PayRow({ total }: { total: number }) {
  const m = usePaymentMethods();
  return <div className="pdp-pay">{m && <PaymentMarks keys={methodNames(m).filter((k) => k !== "klarna" || total >= paymentRules.klarnaMin)} />}</div>;
}

export function ShippingBox() {
  const { cart, discountCode, hydrated } = useStore();
  const s = cartSummary(cart, discountCode);
  return (
    <div className="pdp-ship">
      <p>
        <Truck size={20} aria-hidden="true" />
        <span>
          <strong>Envío {formatEuroPrice(commerceConfig.standardShippingFee)}</strong>, gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}
        </span>
      </p>
      <p>
        <Store size={20} aria-hidden="true" />
        <span>
          <strong>Recogida gratis</strong> en tienda, Pozuelo de Alarcón
        </span>
      </p>
      {hydrated && cart.length > 0 && (
        <div className="pdp-ship-progress" role="status">
          <span>
            {s.freeShippingReached ? "Tu cesta ya tiene el envío gratis." : `A tu cesta le faltan ${formatEuroPrice(s.remainingForFreeShipping)} para el envío gratis.`}
          </span>
          <i aria-hidden="true">
            <b style={{ transform: `scaleX(${s.freeShippingProgress / 100})` }} />
          </i>
        </div>
      )}
      <Link href="/envios-y-devoluciones">Zonas, costes y devoluciones</Link>
    </div>
  );
}

export function Accordion({ title, children, open, id }: { title: string; children: React.ReactNode; open?: boolean; id?: string }) {
  return (
    <details className="faq-item" open={open} id={id}>
      <summary>
        {title}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="faq-answer">{children}</div>
    </details>
  );
}

export function ReturnsAccordion() {
  return (
    <Accordion title="Envíos y devoluciones">
      <p>
        Enviamos a Pozuelo de Alarcón y Aravaca por {formatEuroPrice(commerceConfig.standardShippingFee)}, gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}. Recoger en tienda es gratis.
      </p>
      <p>
        Tienes 14 días naturales para desistir de la compra, con las excepciones que marca la ley. <Link href="/envios-y-devoluciones">Ver las condiciones</Link>
      </p>
    </Accordion>
  );
}

/** Barra de compra fija: aparece cuando el panel (o el botón, en móvil) ya no se ve. */
export function BuyBar({ show, visual, name, price, children }: { show: boolean; visual: React.ReactNode; name: string; price: number; children: React.ReactNode }) {
  return (
    <div className={`sticky-buy ${show ? "is-visible" : ""}`} aria-hidden={!show} inert={!show}>
      <div className="sticky-buy-inner">
        {visual}
        <div className="sticky-buy-copy">
          <strong>{name}</strong>
          <span>{formatEuroPrice(price)}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function RailCard({ href, name, meta, price, visual, onAdd, soldOut }: { href: string; name: string; meta: string; price: number; visual: React.ReactNode; onAdd: () => void; soldOut?: boolean }) {
  const [added, flash] = useAddedFeedback();
  return (
    <li className="pdp-rail-card">
      <Link href={href} className="pdp-rail-media" tabIndex={-1} aria-hidden="true">
        {visual}
      </Link>
      <strong className="price">{formatEuroPrice(price)}</strong>
      <h3>
        <Link href={href}>{name}</Link>
      </h3>
      <p>{meta}</p>
      <button
        type="button"
        className={`btn btn-secondary btn-sm ${added ? "is-added" : ""}`}
        disabled={soldOut}
        aria-label={soldOut ? `${name}: agotado` : `Añadir ${name}`}
        onClick={() => {
          onAdd();
          flash();
        }}
      >
        {added ? <Check size={16} /> : <ShoppingBag size={16} />} {soldOut ? "Agotado" : added ? "Añadido" : "Añadir"}
      </button>
    </li>
  );
}

export function CompleteProducts({ products, soldOut }: { products: Product[]; soldOut: string[] }) {
  const { addProduct } = useStore();
  if (!products.length) return null;
  return (
    <section className="pdp-section" aria-labelledby="completa">
      <h2 id="completa">Completa tu pack</h2>
      <ul className="pdp-rail" data-n={Math.min(4, products.length)}>
        {products.slice(0, 4).map((p) => (
          <RailCard
            key={p.id}
            href={`/product/${p.slug}`}
            name={p.name_es}
            meta={p.subcategory}
            price={p.proposed_price_eur}
            visual={<ProductVisual categoryId={p.category_id} subcategory={p.subcategory} image={p.image} />}
            onAdd={() => addProduct(p.id)}
            soldOut={soldOut.includes(p.id)}
          />
        ))}
      </ul>
    </section>
  );
}

export function CompletePacks({ familyId, soldOut }: { familyId: string; soldOut: string[] }) {
  const { addBundle } = useStore();
  const others = families.flatMap((f) => {
    const b = f.id !== familyId ? getAllBundles().find((x) => x.category_id === f.id && x.tier === "small") : undefined;
    return b ? [{ f, b }] : [];
  });
  return (
    <section className="pdp-section" aria-labelledby="completa">
      <h2 id="completa">Completa tu pack</h2>
      <ul className="pdp-rail" data-n={Math.min(4, others.length)}>
        {others.slice(0, 4).map(({ f, b }) => (
          <RailCard
            key={b.id}
            href={`/packs/${f.id}/small`}
            name={b.name_es}
            meta={`${b.product_ids.length} artículos`}
            price={calculateBundleTotal(b)}
            visual={<Image src={f.image} alt="" fill sizes="(max-width: 700px) 60vw, 25vw" />}
            onAdd={() => addBundle(b.id, b.tier)}
            soldOut={b.product_ids.some((id) => soldOut.includes(id))}
          />
        ))}
      </ul>
    </section>
  );
}

export function FamilyTiles() {
  return (
    <section className="pdp-section" aria-labelledby="familias">
      <h2 id="familias">Empieza por otra estancia</h2>
      <ul className="pdp-families">
        {families.map((f) => (
          <li key={f.id}>
            <Link href={`/packs/${f.id}/medium`}>
              <Image src={f.image} alt="" fill sizes="(max-width: 700px) 50vw, 25vw" />
              <span>
                Pack {f.label} <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FactsBand() {
  const facts: [string, string][] = [
    [String(getAllProducts().length), "artículos para casa"],
    [String(getAllBundles().length), "packs en tres tamaños"],
    [formatEuroPrice(commerceConfig.freeShippingThreshold), "y el envío es gratis"],
    ["0 €", "por recoger en tienda"],
    ["14 días", "para desistir de la compra"],
  ];
  return (
    <section className="pdp-facts" aria-labelledby="datos">
      <div>
        <h2 id="datos">Precio claro, cero sorpresas.</h2>
        <dl>
          {facts.map(([n, t]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function PdpFaq() {
  return (
    <section className="pdp-section pdp-faq" aria-labelledby="dudas">
      <div>
        <h2 id="dudas">¿Dudas? Las de siempre, resueltas.</h2>
        <Link className="text-link" href="/faq">
          Todas las preguntas <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="hp-home-faq">
        {FAQ.filter((f) => f.home).map((f) => (
          <Accordion key={f.q} title={f.q}>
            <p>{f.a}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
