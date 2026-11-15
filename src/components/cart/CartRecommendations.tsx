"use client";
import Link from "next/link";
import { useMemo } from "react";
import { amountToFreeShipping } from "@/config/commerce";
import { getCartRecommendations } from "@/lib/cart/recommendations";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { useStore } from "@/state/store";

/** "Completa tu pedido": compact rows, prioritising items that unlock free shipping. */
export function CartRecommendations({ variant = "drawer", limit = 4 }: { variant?: "drawer" | "page"; limit?: number }) {
  const { cart, cartTotal } = useStore();
  const gap = amountToFreeShipping(cartTotal);
  const items = useMemo(() => getCartRecommendations(cart, gap, limit), [cart, gap, limit]);
  if (!items.length) return null;

  return (
    <section className={`reco reco--${variant}`} aria-labelledby={`reco-title-${variant}`}>
      <h3 id={`reco-title-${variant}`}>Completa tu pedido</h3>
      <p className="reco__sub">{gap > 0 ? "Combinan con lo que llevas. Algunos te acercan al envío gratis." : "Combinan con lo que llevas."}</p>
      <ul>
        {items.map((product) => (
          <li key={product.id}>
            <Link href={`/product/${product.slug}`} className="reco__thumb" tabIndex={-1} aria-hidden="true"><ProductVisual product={product} sizes="64px" /></Link>
            <div className="reco__text">
              <Link href={`/product/${product.slug}`}>{product.name_es}</Link>
              <span className="price">{formatEuroPrice(product.proposed_price_eur)}</span>
            </div>
            <AddToCartButton productId={product.id} productName={product.name_es} className="btn btn-secondary btn-xs" />
          </li>
        ))}
      </ul>
    </section>
  );
}
