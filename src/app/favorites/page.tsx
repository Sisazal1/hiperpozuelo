"use client";
import Link from "next/link";
import { Heart, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import ProductVisual from "@/components/catalog/ProductVisual";

export default function Favorites() {
  const { favoriteProducts, toggleFavorite, addProduct, hydrated } = useStore();
  return (
    <div className="commerce-page">
      <div className="commerce-container">
        <div className="commerce-heading" data-reveal>
          <div>
            <span className="eyebrow">Tu selección</span>
            <h1>Favoritos</h1>
          </div>
          {favoriteProducts.length > 0 && <span className="dev-pill">{favoriteProducts.length} guardados</span>}
        </div>
        {!hydrated ? (
          <div className="skeleton-block" style={{ height: 280 }} aria-hidden="true" />
        ) : favoriteProducts.length ? (
          <ul className="favorites-grid" data-reveal-stagger>
            {favoriteProducts.map((item) => (
              <li className="favorite-card" key={item.id} data-reveal>
                <Link href={`/product/${item.slug}`} className="favorite-media" tabIndex={-1} aria-hidden="true">
                  <ProductVisual categoryId={item.category_id} subcategory={item.subcategory} image={item.image} name={item.name_es} />
                </Link>
                <button className="favorite-remove" onClick={() => toggleFavorite(item.id)} aria-label={`Quitar ${item.name_es} de favoritos`}>
                  <X size={16} />
                </button>
                <div className="favorite-body">
                  <span className="product-category">{item.subcategory}</span>
                  <h2>
                    <Link href={`/product/${item.slug}`}>{item.name_es}</Link>
                  </h2>
                  <strong className="price">{formatEuroPrice(item.proposed_price_eur)}</strong>
                  <button className="btn btn-primary btn-block" onClick={() => addProduct(item.id)}>
                    <ShoppingBag size={16} /> Añadir a la cesta
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-commerce" data-reveal>
            <span className="empty-bag" aria-hidden="true">
              <Heart size={32} strokeWidth={1.4} />
            </span>
            <h2>Aún no tienes favoritos</h2>
            <p>Toca el corazón de cualquier producto para guardarlo aquí.</p>
            <Link href="/shop" className="btn btn-primary">
              Explorar la tienda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
