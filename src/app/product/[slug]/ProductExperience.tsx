"use client";
import { useEffect, useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import type { Product } from "@/types/catalog";
import CatalogVisual from "@/components/catalog/CatalogVisual";

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { addProduct } = useStore();
  return (
    <article className="catalog-card">
      <button className="quick-view-trigger" onClick={onOpen}>
        Vista rápida
      </button>
      <button className="catalog-image" onClick={onOpen} aria-label={`Ver ${product.name_es}`}>
        <CatalogVisual image={product.image} label={product.subcategory} />
      </button>
      <div className="catalog-card-info">
        <span className="product-category">{product.subcategory}</span>
        <h2>{product.name_es}</h2>
        <strong>{formatEuroPrice(product.proposed_price_eur)}</strong>
      </div>
      <button className="add-button" onClick={() => addProduct(product.id)}>
        <ShoppingBag size={15} /> Añadir a la cesta
      </button>
    </article>
  );
}

function QuickView({ product, close }: { product: Product; close: () => void }) {
  const { addProduct } = useStore();
  const [quantity, setQuantity] = useState(1);
  return (
    <div
      className="quick-view-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
        <button className="modal-close" onClick={close} aria-label="Cerrar vista rápida">
          <X size={20} />
        </button>
        <div className="quick-view-image">
          <CatalogVisual image={product.image} label={product.subcategory} />
        </div>
        <span className="product-category">{product.subcategory}</span>
        <h2 id="quick-view-title">{product.name_es}</h2>
        <strong className="detail-price">{formatEuroPrice(product.proposed_price_eur)}</strong>
        <div className="quick-view-actions">
          <div className="quantity-control">
            <button aria-label="Reducir cantidad" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus size={16} />
            </button>
            <strong>{quantity}</strong>
            <button aria-label="Aumentar cantidad" onClick={() => setQuantity(quantity + 1)}>
              <Plus size={16} />
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              for (let i = 0; i < quantity; i += 1) addProduct(product.id);
              close();
            }}
          >
            Añadir · {formatEuroPrice(product.proposed_price_eur * quantity)}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ProductExperience({ product }: { product: Product }) {
  const { favorites, toggleFavorite, addProduct } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [slide, setSlide] = useState(0);
  const [quick, setQuick] = useState<Product | null>(null);
  const related = useMemo(
    () =>
      getComplementaryProducts(product.id).filter((item): item is NonNullable<typeof item> =>
        Boolean(item),
      ) as Product[],
    [product.id],
  );
  const saved = favorites.includes(product.id);
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem("hp-recent-products") || "[]") as string[];
    localStorage.setItem(
      "hp-recent-products",
      JSON.stringify([product.id, ...raw.filter((id) => id !== product.id)].slice(0, 4)),
    );
  }, [product.id]);
  const add = () => {
    for (let i = 0; i < quantity; i += 1) addProduct(product.id);
  };
  return (
    <>
      <div className="product-detail">
        <div className="product-gallery">
          <div className="detail-image">
            <CatalogVisual image={product.image} label={product.subcategory} />
          </div>
          <div className="gallery-dots" aria-label="Galería">
            <button className="selected" onClick={() => setSlide(0)} aria-label="Imagen 1" />
          </div>
        </div>
        <div className="detail-copy">
          <span className="product-category">{product.subcategory}</span>
          <h1>{product.name_es}</h1>
          <p>{product.description_es}</p>
          <strong className="detail-price">{formatEuroPrice(product.proposed_price_eur)}</strong>
          <div className="purchase-panel">
            <div className="quantity-control">
              <button aria-label="Reducir cantidad" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={16} />
              </button>
              <strong>{quantity}</strong>
              <button aria-label="Aumentar cantidad" onClick={() => setQuantity(quantity + 1)}>
                <Plus size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={add}>
              <ShoppingBag size={17} /> Añadir a la cesta ·{" "}
              {formatEuroPrice(product.proposed_price_eur * quantity)}
            </button>
            <button className="favorite-detail" onClick={() => toggleFavorite(product.id)}>
              <Heart size={18} fill={saved ? "currentColor" : "none"} />{" "}
              {saved ? "Guardado" : "Añadir a favoritos"}
            </button>
          </div>
          <div className="delivery-rows">
            <div>
              <strong>Envío</strong>
              <span>Desde {formatEuroPrice(30)} gratis</span>
            </div>
            <div>
              <strong>Recogida</strong>
              <span>Gratis en tienda</span>
            </div>
            <div>
              <strong>Devoluciones</strong>
              <span>Consulta las condiciones</span>
            </div>
          </div>
          <details open>
            <summary>Descripción</summary>
            <p>{product.description_es}</p>
          </details>
          <details>
            <summary>Envío y devoluciones</summary>
            <p>Consulta la información disponible antes de confirmar tu pedido.</p>
          </details>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-products">
          <h2>Combina bien con</h2>
          <div className="catalog-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} onOpen={() => setQuick(item)} />
            ))}
          </div>
        </section>
      )}
      {quick && <QuickView product={quick} close={() => setQuick(null)} />}
      <div className="mobile-purchase-bar">
        <strong>{formatEuroPrice(product.proposed_price_eur * quantity)}</strong>
        <button className="btn btn-primary" onClick={add}>
          Añadir a la cesta
        </button>
      </div>
    </>
  );
}
