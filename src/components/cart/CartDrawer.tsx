"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useStore } from "@/state/store";
import { commerceConfig } from "@/config/commerce";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { ShippingProgress } from "@/components/ui/ShippingProgress";
import { CartLineRow } from "./CartLineRow";
import { CartRecommendations } from "./CartRecommendations";

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

export default function CartDrawer() {
  const { cart, cartCount, cartTotal, cartDrawerOpen, closeCartDrawer } = useStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (cartDrawerOpen) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      setClosing(false);
      requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(".drawer__close")?.focus());
      return;
    }
    if (mounted) {
      setClosing(true);
      const timer = window.setTimeout(() => { setMounted(false); setClosing(false); returnFocus.current?.focus(); }, 240);
      return () => window.clearTimeout(timer);
    }
  }, [cartDrawerOpen, mounted]);

  useEffect(() => { if (cartDrawerOpen) closeCartDrawer(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeCartDrawer(); return; }
      if (event.key !== "Tab" || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [mounted, closeCartDrawer]);

  if (!mounted) return null;
  const empty = cart.length === 0;

  return (
    <div className={`drawer-layer ${closing ? "is-closing" : ""}`}>
      <button type="button" className="drawer-overlay" aria-label="Cerrar cesta" onClick={closeCartDrawer} />
      <aside ref={panel} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer__head">
          <div>
            <h2 id="drawer-title">Tu cesta</h2>
            {!empty && <span>{cartCount} {cartCount === 1 ? "artículo" : "artículos"}</span>}
          </div>
          <button type="button" className="icon-btn drawer__close" aria-label="Cerrar cesta" onClick={closeCartDrawer}><X size={22} aria-hidden="true" /></button>
        </header>

        {empty ? (
          <div className="drawer__empty">
            <span className="empty__icon"><ShoppingBag size={28} aria-hidden="true" /></span>
            <h3>Tu cesta está vacía</h3>
            <p>Empieza por un pack o elige productos sueltos.</p>
            <Link className="btn btn-primary" href="/packs" onClick={closeCartDrawer}>Ver packs</Link>
            <Link className="btn btn-secondary" href="/shop" onClick={closeCartDrawer}>Explorar la tienda</Link>
          </div>
        ) : (
          <>
            <div className="drawer__scroll">
              <ShippingProgress subtotal={cartTotal} />
              <div className="drawer__lines">{cart.map((line) => <CartLineRow key={line.lineId} line={line} variant="drawer" />)}</div>
              <CartRecommendations variant="drawer" />
            </div>
            <footer className="drawer__foot">
              <div className="drawer__subtotal"><span>Subtotal</span><strong>{formatEuroPrice(cartTotal)}</strong></div>
              <p>Envío a domicilio {formatEuroPrice(commerceConfig.standardShippingFee)} (gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}). Recogida en tienda gratis.</p>
              <Link className="btn btn-primary btn-lg btn-block" href="/checkout" onClick={closeCartDrawer}>Finalizar compra</Link>
              <Link className="btn btn-ghost btn-block" href="/cart" onClick={closeCartDrawer}>Ver cesta completa</Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
