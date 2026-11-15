"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { ProductVisual } from "./ProductVisual";
import { AddToCartButton } from "./AddToCartButton";
import type { Product } from "@/types/catalog";

type Props = { product: Product; priority?: boolean; compact?: boolean };

export function ProductCard({ product, priority = false, compact = false }: Props) {
  const { favorites, toggleFavorite } = useStore();
  const saved = favorites.includes(product.id);
  return (
    <article className={`product-card ${compact ? "product-card--compact" : ""}`}>
      <div className="product-card__media">
        <Link href={`/product/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <ProductVisual product={product} priority={priority} />
        </Link>
        <button
          type="button"
          className="fav-btn"
          aria-pressed={saved}
          aria-label={saved ? `Quitar ${product.name_es} de favoritos` : `Guardar ${product.name_es} en favoritos`}
          onClick={() => toggleFavorite(product.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <div className="product-card__body">
        <span className="product-card__cat">{product.subcategory}</span>
        <h3 className="product-card__title">
          <Link href={`/product/${product.slug}`}>{product.name_es}</Link>
        </h3>
        <div className="product-card__foot">
          <span className="price">{formatEuroPrice(product.proposed_price_eur)}</span>
          <AddToCartButton productId={product.id} productName={product.name_es} />
        </div>
      </div>
    </article>
  );
}
