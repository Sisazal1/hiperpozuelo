"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, RotateCcw, ShoppingBag, Store, Truck } from "lucide-react";
import { getAllBundles, calculateBundleTotal, TIER_LABEL } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { commerceConfig } from "@/config/commerce";
import { useStore } from "@/state/store";
import type { BundleTier } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useAddedFeedback, useScrolledPast, useTweenedNumber } from "@/components/motion/hooks";

import { families } from "@/lib/catalog/families";
const tiers: BundleTier[] = ["small", "medium", "large"];

export default function PacksExperience({
  initialFamily = "__overview__",
  initialTier = "medium",
}: {
  initialFamily?: string;
  initialTier?: BundleTier;
}) {
  return initialFamily === "__overview__" ? <PacksOverview /> : <PackDetail family={initialFamily} tier={initialTier} />;
}

function PacksOverview() {
  const bundles = getAllBundles();
  return (
    <div className="packs-page packs-overview-page">
      <header className="packs-overview-hero">
        <span className="eyebrow" data-reveal>
          Packs prediseñados
        </span>
        <h1 data-reveal>Elige una estancia. Nosotros ponemos el resto.</h1>
        <p data-reveal>Cuatro packs, tres tamaños cada uno. Ves qué lleva y cuánto cuesta antes de decidir.</p>
      </header>
      <div className="packs-family-grid" data-reveal-stagger>
        {families.map((family, index) => {
          const familyBundles = bundles.filter((bundle) => bundle.category_id === family.id);
          const from = Math.min(...familyBundles.map(calculateBundleTotal));
          return (
            <article className="pack-family-card" id={family.id} key={family.id} data-reveal>
              <Link href={`/packs/${family.id}/medium`} className="pack-family-media" tabIndex={-1} aria-hidden="true">
                <Image src={family.image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" priority={index < 2} />
                <span className="pack-family-from">Desde {formatEuroPrice(from)}</span>
              </Link>
              <div className="pack-family-copy">
                <h2>
                  <Link href={`/packs/${family.id}/medium`}>Pack {family.label}</Link>
                </h2>
                <p>{family.intro}</p>
                <ul className="pack-size-list">
                  {tiers.map((tier) => {
                    const bundle = familyBundles.find((item) => item.tier === tier);
                    return bundle ? (
                      <li key={tier}>
                        <Link href={`/packs/${family.id}/${tier}`} className="pack-size-row">
                          <span>
                            {TIER_LABEL[tier]}
                            <small>{bundle.product_ids.length} artículos</small>
                          </span>
                          <strong className="price">{formatEuroPrice(calculateBundleTotal(bundle))}</strong>
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
      <section className="packs-custom-callout" data-reveal>
        <div>
          <span className="eyebrow">¿Ya sabes lo que quieres?</span>
          <h2>Monta tu propio pack.</h2>
          <p>Eliges productos y cantidades. El precio se actualiza al momento.</p>
        </div>
        <Link className="btn btn-primary" href="/build-pack">
          Crear mi pack <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}

function PackDetail({ family: familyId, tier }: { family: string; tier: BundleTier }) {
  const { addBundle } = useStore();
  const family = families.find((item) => item.id === familyId);
  const familyBundles = getAllBundles().filter((bundle) => bundle.category_id === familyId);
  const selected = familyBundles.find((bundle) => bundle.tier === tier);
  const [quantity, setQuantity] = useState(1);
  const [added, flash] = useAddedFeedback(1800);
  const cta = useRef<HTMLDivElement>(null);
  const showBar = useScrolledPast(cta);
  const packPrice = selected ? calculateBundleTotal(selected) : 0;
  const shownPrice = useTweenedNumber(packPrice * quantity);
  const unitPrice = useTweenedNumber(packPrice);

  if (!family || !selected)
    return (
      <div className="packs-page">
        <div className="packs-hero">
          <h1>Pack no disponible</h1>
          <Link href="/packs" className="btn btn-primary">
            Ver todos los packs
          </Link>
        </div>
      </div>
    );

  const tierIndex = tiers.indexOf(tier);
  const add = () => {
    for (let i = 0; i < quantity; i += 1) addBundle(selected.id, selected.tier);
    flash();
  };
  return (
    <div className="packs-page pack-detail-page">
      <section className="pack-detail-hero">
        <div className="pack-detail-hero-copy">
          <Link className="back-link" href="/packs">
            <ArrowLeft size={16} /> Todos los packs
          </Link>
          <span className="eyebrow">{family.label}</span>
          <h1>{selected.name_es}</h1>
          <p>{family.tagline} {selected.description_es}</p>
          <div className="pack-segmented" role="radiogroup" aria-label="Tamaño del pack" style={{ ["--tier-index" as string]: tierIndex }}>
            <span className="pack-segmented-pill" aria-hidden="true" />
            {tiers.map((t) => {
              const b = familyBundles.find((item) => item.tier === t);
              return (
                <Link
                  key={t}
                  href={`/packs/${familyId}/${t}`}
                  scroll={false}
                  replace
                  role="radio"
                  aria-checked={tier === t}
                  className={tier === t ? "selected" : ""}
                >
                  {TIER_LABEL[t]}
                  <small>{b?.product_ids.length ?? 0} artículos</small>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="pack-detail-hero-media" data-reveal="scale">
          <Image src={family.image} alt={`Ambiente de ${family.label.toLowerCase()}`} fill sizes="(max-width: 900px) 100vw, 40vw" priority />
        </div>
      </section>
      <section className="pack-detail-layout">
        <div className="pack-detail-includes">
          <div className="pack-detail-heading">
            <span className="eyebrow">Dentro del pack</span>
            <h2>
              Lo que incluye <span className="count-badge">{selected.product_ids.length}</span>
            </h2>
          </div>
          <ul className="pack-product-list" key={tier} data-reveal-stagger>
            {selected.product_ids.map((id) => {
              const product = getProductById(id);
              if (!product) return null;
              return (
                <li key={id} data-reveal>
                  <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} size="sm" />
                  <span>
                    <Link href={`/product/${product.slug}`}>{product.name_es}</Link>
                    <small>{product.subcategory}</small>
                  </span>
                  <b>{formatEuroPrice(product.proposed_price_eur)}</b>
                </li>
              );
            })}
          </ul>
        </div>
        <aside className="pack-detail-summary" aria-label="Comprar pack">
          <span className="eyebrow">Pack {TIER_LABEL[tier].toLowerCase()}</span>
          <strong className="pack-summary-price">{formatEuroPrice(unitPrice)}</strong>
          <p>{selected.product_ids.length} artículos · el precio es la suma de lo que incluye</p>
          <div className="pack-buy-row" ref={cta}>
            <div className="quantity-control" role="group" aria-label="Cantidad de packs">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Reducir cantidad">
                <Minus size={16} />
              </button>
              <span key={quantity} className="qty-value" aria-live="polite">
                {quantity}
              </span>
              <button onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="Aumentar cantidad">
                <Plus size={16} />
              </button>
            </div>
            <button className={`btn btn-primary btn-lg add-main ${added ? "is-added" : ""}`} onClick={add}>
              <span className="add-main-label">
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                {added ? "Añadido" : "Añadir pack"}
              </span>
              <span className="add-main-price">{formatEuroPrice(shownPrice)}</span>
            </button>
          </div>
          <ul className="delivery-rows">
            <li>
              <Truck size={18} />
              <span>
                Envío {formatEuroPrice(commerceConfig.standardShippingFee)} · <strong>gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}</strong>
              </span>
            </li>
            <li>
              <Store size={18} />
              <span>
                <strong>Recogida gratis</strong> en tienda
              </span>
            </li>
            <li>
              <RotateCcw size={18} />
              <span>
                <strong>14 días</strong> para desistir
              </span>
            </li>
          </ul>
        </aside>
      </section>
      <div className={`sticky-buy ${showBar ? "is-visible" : ""}`} aria-hidden={!showBar} inert={!showBar}>
        <div className="sticky-buy-inner">
          <div className="sticky-buy-copy">
            <strong>{selected.name_es}</strong>
            <span>{formatEuroPrice(packPrice * quantity)}</span>
          </div>
          <button className={`btn btn-primary ${added ? "is-added" : ""}`} onClick={add} tabIndex={showBar ? 0 : -1}>
            {added ? <Check size={17} /> : <ShoppingBag size={17} />} {added ? "Añadido" : "Añadir pack"}
          </button>
        </div>
      </div>
    </div>
  );
}
