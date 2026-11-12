"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/state/store";
import { getProductById } from "@/lib/catalog/products";
import { getBundleById, calculateBundleTotal } from "@/lib/catalog/bundles";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { logisticsConfig } from "@/lib/checkout/config";
import { commerceConfig, shippingProgress } from "@/config/commerce";

export default function CartDrawer() {
  const { cart, cartCount, cartTotal, cartDrawerOpen, closeCartDrawer, updateQuantity, removeLine, addProduct } = useStore();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (cartDrawerOpen) {
      returnFocus.current = document.activeElement as HTMLElement;
      setVisible(true); setClosing(false);
      requestAnimationFrame(() => closeButton.current?.focus());
    } else if (visible) {
      setClosing(true);
      const timer = window.setTimeout(() => { setVisible(false); setClosing(false); returnFocus.current?.focus(); }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [cartDrawerOpen]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") requestClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [visible]);

  const requestClose = () => { setClosing(true); window.setTimeout(() => closeCartDrawer(), 250); };
  const productIds = cart.flatMap((line) => line.type === "product" ? [line.productId] : line.type === "bundle" ? (getBundleById(line.bundleId)?.product_ids ?? []) : line.productIds);
  const recommendations = useMemo(() => {
    const existing = new Set(productIds);
    const result = productIds.flatMap((id) => getComplementaryProducts(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)).filter((item, index, all) => !existing.has(item.id) && all.findIndex((candidate) => candidate.id === item.id) === index);
    return result.slice(0, 8);
  }, [cart]);

  if (!visible) return null;
  return <div className={`cart-drawer-layer ${closing ? "is-closing" : ""}`}>
    <button className="cart-drawer-overlay" aria-label="Cerrar cesta" onClick={requestClose} />
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <header className="cart-drawer-header"><div><h2 id="cart-drawer-title">Tu cesta</h2><span>{cartCount} {cartCount === 1 ? "artículo" : "artículos"}</span></div><button ref={closeButton} className="icon-button" onClick={requestClose} aria-label="Cerrar cesta"><X size={22}/></button></header>
      <div className="cart-drawer-scroll">
        {logisticsConfig.freeDeliveryThreshold !== null && <div className="cart-shipping-progress">{cartTotal >= commerceConfig.freeShippingThreshold ? "Has conseguido el envío gratis" : `Añade ${formatEuroPrice(commerceConfig.freeShippingThreshold - cartTotal)} más para envío gratis`}<div className="cart-progress-track"><span style={{width:`${shippingProgress(cartTotal)}%`}}/></div></div>}
        {cart.length === 0 ? <div className="cart-drawer-empty"><ShoppingCart size={34}/><h3>Tu cesta está vacía</h3><p>Explora el catálogo para encontrar lo que necesitas.</p><button className="btn btn-primary" onClick={requestClose}>Seguir comprando</button></div> : <>
          <div className="cart-drawer-lines">{cart.map((line) => <DrawerLine key={line.lineId} line={line} expanded={Boolean(expanded[line.lineId])} onToggle={() => setExpanded((value) => ({...value, [line.lineId]: !value[line.lineId]}))} onQuantity={(delta) => updateQuantity(line.lineId, delta)} onRemove={() => removeLine(line.lineId)} />)}</div>
          {recommendations.length > 0 && <section className="cart-cross-sell"><h3>Completa tu compra</h3><p>Productos que combinan con tu selección</p><div className="cart-cross-sell-track">{recommendations.map((product) => <article className="cart-recommendation" key={product.id}><div className="cart-recommendation-image">Imagen pendiente</div><strong>{product.name_es}</strong><span>{formatEuroPrice(product.proposed_price_eur)}</span><button className="btn btn-secondary" onClick={() => addProduct(product.id)}>Añadir</button></article>)}</div></section>}
        </>}
      </div>
      <footer className="cart-drawer-footer"><div><span>Subtotal</span><strong>{formatEuroPrice(cartTotal)}</strong></div>{cart.length ? <Link className="btn btn-primary" href="/checkout" onClick={requestClose}>Continuar con la compra</Link> : <button className="btn btn-primary is-disabled" disabled>Continuar con la compra</button>}<button className="cart-continue" onClick={requestClose}>Seguir comprando</button></footer>
    </aside>
  </div>;
}

function DrawerLine({ line, expanded, onToggle, onQuantity, onRemove }: { line: import("@/state/store").CartLine; expanded: boolean; onToggle: () => void; onQuantity: (delta: number) => void; onRemove: () => void }) {
  const bundle = line.type === "bundle" ? getBundleById(line.bundleId) : null;
  const title = line.type === "product" ? getProductById(line.productId)?.name_es ?? "Producto" : line.type === "bundle" ? bundle?.name_es ?? "Pack" : "Pack personalizado";
  const unit = line.type === "product" ? getProductById(line.productId)?.proposed_price_eur ?? 0 : line.type === "bundle" ? calculateBundleTotal(line.bundleId) : line.productIds.reduce((sum, id) => sum + (getProductById(id)?.proposed_price_eur ?? 0) * (line.quantities[id] ?? 0), 0);
  const ids = line.type === "bundle" ? (bundle?.product_ids ?? []) : line.type === "custom_bundle" ? line.productIds : [];
  return <article className="cart-drawer-line"><div className="cart-drawer-thumb">Imagen<br/>pendiente</div><div className="cart-drawer-line-main"><div className="cart-drawer-line-heading"><strong>{title}</strong><button className="icon-button" onClick={onRemove} aria-label={`Eliminar ${title}`}><Trash2 size={16}/></button></div>{line.type !== "product" && <button className="cart-line-expand" onClick={onToggle} aria-expanded={expanded}>{line.type === "bundle" ? `${line.tier} · ` : ""}{ids.length} productos {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>}<div className="cart-drawer-line-meta"><div className="quantity-control"><button onClick={() => onQuantity(-1)} aria-label={`Reducir cantidad de ${title}`}><Minus size={15}/></button><span>{line.quantity}</span><button onClick={() => onQuantity(1)} aria-label={`Aumentar cantidad de ${title}`}><Plus size={15}/></button></div><span>{formatEuroPrice(unit * line.quantity)}</span></div>{expanded && <ul className="cart-drawer-contents">{ids.map((id) => <li key={id}><span>{getProductById(id)?.name_es ?? "Producto no disponible"}</span><span>{line.type === "custom_bundle" ? line.quantities[id] ?? 0 : 1}</span></li>)}</ul>}</div></article>;
}
