"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Heart, Minus, Plus, RotateCcw, ShoppingBag, Store, Truck, X } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { getCategoryById } from "@/lib/catalog/categories";
import { commerceConfig } from "@/config/commerce";
import type { Product } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import { track } from "@/lib/track";
import { useAddedFeedback, useFocusTrap, useScrolledPast, useTweenedNumber } from "@/components/motion/hooks";

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { addProduct } = useStore();
  const [added, flash] = useAddedFeedback();
  return (
    <article className="catalog-card" data-reveal>
      <button className="catalog-image" onClick={onOpen} aria-label={`Vista rápida de ${product.name_es}`}>
        <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} />
        <span className="quick-view-chip" aria-hidden="true">
          Vista rápida
        </span>
      </button>
      <div className="catalog-card-info">
        <span className="product-category">{product.subcategory}</span>
        <h3>
          <Link href={`/product/${product.slug}`}>{product.name_es}</Link>
        </h3>
        <strong className="price">{formatEuroPrice(product.proposed_price_eur)}</strong>
      </div>
      <button
        className={`add-button ${added ? "is-added" : ""}`}
        onClick={() => {
          addProduct(product.id);
          flash();
        }}
        aria-label={added ? `Añadido: ${product.name_es}` : `Añadir: ${product.name_es}`}
      >
        {added ? <Check size={15} /> : <ShoppingBag size={15} />} {added ? "Añadido" : "Añadir"}
      </button>
    </article>
  );
}

function QuickView({ product, close }: { product: Product; close: () => void }) {
  const { addProduct } = useStore();
  const [quantity, setQuantity] = useState(1);
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useFocusTrap(panel, true, close);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = o;
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="quick-view-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={panel} className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
        <button ref={closeBtn} className="modal-close" onClick={close} aria-label="Cerrar vista rápida">
          <X size={20} />
        </button>
        <div className="quick-view-image">
          <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} size="lg" />
        </div>
        <div className="quick-view-body">
          <span className="product-category">{product.subcategory}</span>
          <h2 id="quick-view-title">{product.name_es}</h2>
          <p>{product.description_es}</p>
          <strong className="detail-price">{formatEuroPrice(product.proposed_price_eur)}</strong>
          <div className="quick-view-actions">
            <Stepper value={quantity} onChange={setQuantity} label={product.name_es} />
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
          <Link className="text-link" href={`/product/${product.slug}`}>
            Ver ficha completa <ChevronRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="quantity-control" role="group" aria-label={`Cantidad de ${label}`}>
      <button aria-label="Reducir cantidad" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus size={16} />
      </button>
      <span key={value} className="qty-value" aria-live="polite">
        {value}
      </span>
      <button aria-label="Aumentar cantidad" disabled={value >= 99} onClick={() => onChange(Math.min(99, value + 1))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function ProductExperience({ product }: { product: Product }) {
  useEffect(() => track("product_view"), [product.id]);
  const { favorites, toggleFavorite, addProduct } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [quick, setQuick] = useState<Product | null>(null);
  const [added, flash] = useAddedFeedback();
  const cta = useRef<HTMLDivElement>(null);
  const showBar = useScrolledPast(cta);
  const price = useTweenedNumber(product.proposed_price_eur * quantity);
  const category = getCategoryById(product.category_id);
  const related = useMemo(
    () => getComplementaryProducts(product.id).filter((item): item is NonNullable<typeof item> => Boolean(item)) as Product[],
    [product.id],
  );
  const saved = favorites.includes(product.id);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hp-recent-products") || "[]");
      const list = Array.isArray(raw) ? raw : [];
      localStorage.setItem("hp-recent-products", JSON.stringify([product.id, ...list.filter((id: string) => id !== product.id)].slice(0, 4)));
    } catch {}
  }, [product.id]);
  const add = () => {
    for (let i = 0; i < quantity; i += 1) addProduct(product.id);
    flash();
  };
  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <ol>
          <li>
            <Link href="/shop">Tienda</Link>
          </li>
          {category && (
            <li>
              <Link href={`/category/${category.id}`}>{category.name_es}</Link>
            </li>
          )}
          <li aria-current="page">{product.name_es}</li>
        </ol>
      </nav>
      <div className="product-detail">
        <div className="product-gallery" data-reveal="scale">
          <div className="detail-image">
            <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} size="lg" priority />
          </div>
        </div>
        <div className="detail-copy" data-reveal-stagger>
          <span className="product-category" data-reveal>
            {product.subcategory}
          </span>
          <h1 data-reveal>{product.name_es}</h1>
          <p className="detail-lede" data-reveal>
            {product.description_es}
          </p>
          <strong className="detail-price" data-reveal>
            {formatEuroPrice(product.proposed_price_eur)}
          </strong>
          <div className="purchase-panel" ref={cta} data-reveal>
            <Stepper value={quantity} onChange={setQuantity} label={product.name_es} />
            <button className={`btn btn-primary btn-lg add-main ${added ? "is-added" : ""}`} onClick={add}>
              <span className="add-main-label">
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                {added ? "Añadido a la cesta" : "Añadir a la cesta"}
              </span>
              <span className="add-main-price">{formatEuroPrice(price)}</span>
            </button>
            <button
              className={`favorite-detail ${saved ? "is-saved" : ""}`}
              onClick={() => toggleFavorite(product.id)}
              aria-pressed={saved}
              aria-label={saved ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Heart size={20} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
          <ul className="delivery-rows" data-reveal>
            <li>
              <Truck size={18} />
              <span>
                <strong>Envío {formatEuroPrice(commerceConfig.standardShippingFee)}</strong> · gratis desde{" "}
                {formatEuroPrice(commerceConfig.freeShippingThreshold)}
              </span>
            </li>
            <li>
              <Store size={18} />
              <span>
                <strong>Recogida gratis</strong> en tienda, Pozuelo de Alarcón
              </span>
            </li>
            <li>
              <RotateCcw size={18} />
              <span>
                <strong>14 días</strong> para desistir de la compra ·{" "}
                <Link href="/envios-y-devoluciones">condiciones</Link>
              </span>
            </li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-products" aria-labelledby="related-title">
          <h2 id="related-title" data-reveal>
            Combina bien con
          </h2>
          <div className="catalog-grid" data-reveal-stagger>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} onOpen={() => setQuick(item)} />
            ))}
          </div>
        </section>
      )}
      {quick && <QuickView product={quick} close={() => setQuick(null)} />}
      <div className={`sticky-buy ${showBar ? "is-visible" : ""}`} aria-hidden={!showBar} inert={!showBar}>
        <div className="sticky-buy-inner">
          <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} size="sm" />
          <div className="sticky-buy-copy">
            <strong>{product.name_es}</strong>
            <span>{formatEuroPrice(product.proposed_price_eur * quantity)}</span>
          </div>
          <button className={`btn btn-primary ${added ? "is-added" : ""}`} onClick={add} tabIndex={showBar ? 0 : -1}>
            {added ? <Check size={17} /> : <ShoppingBag size={17} />} {added ? "Añadido" : "Añadir"}
          </button>
        </div>
      </div>
    </>
  );
}
