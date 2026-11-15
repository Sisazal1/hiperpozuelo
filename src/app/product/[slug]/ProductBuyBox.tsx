"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { roundMoney } from "@/config/commerce";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

type Props = { productId: string; productName: string; price: number };

/** Quantity + add to cart + favourite, plus a sticky bar that appears on mobile once the main button scrolls out of view. */
export function ProductBuyBox({ productId, productName, price }: Props) {
  const { addProduct, favorites, toggleFavorite } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [done, setDone] = useState(false);
  const [stuck, setStuck] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const saved = favorites.includes(productId);

  useEffect(() => {
    const node = anchor.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const add = () => {
    addProduct(productId, quantity);
    setDone(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  };

  return (
    <>
      <div className="buybox" ref={anchor}>
        <QuantityStepper value={quantity} label={productName} onChange={(delta) => setQuantity((q) => Math.min(99, Math.max(1, q + delta)))} />
        <button type="button" className={`btn btn-primary btn-lg buybox__add ${done ? "is-done" : ""}`} onClick={add}>
          <span className="btn__swap" aria-live="polite">
            {done ? <><Check size={18} aria-hidden="true" /> Añadido a la cesta</> : <><ShoppingBag size={18} aria-hidden="true" /> Añadir a la cesta · {formatEuroPrice(roundMoney(price * quantity))}</>}
          </span>
        </button>
        <button type="button" className="icon-btn icon-btn--outline" aria-pressed={saved} aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"} onClick={() => toggleFavorite(productId)}>
          <Heart size={20} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>

      <div className={`sticky-buy ${stuck ? "is-visible" : ""}`} aria-hidden={!stuck}>
        <div className="sticky-buy__text">
          <strong>{productName}</strong>
          <span className="price">{formatEuroPrice(price)}</span>
        </div>
        <button type="button" tabIndex={stuck ? 0 : -1} className={`btn btn-primary btn-lg ${done ? "is-done" : ""}`} onClick={add}>
          {done ? <><Check size={18} aria-hidden="true" /> Añadido</> : <><ShoppingBag size={18} aria-hidden="true" /> Añadir</>}
        </button>
      </div>
    </>
  );
}
