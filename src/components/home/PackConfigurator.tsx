"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { getAllBundles, calculateBundleTotal, TIER_LABEL } from "@/lib/catalog/bundles";
import { families } from "@/lib/catalog/families";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { useStore } from "@/state/store";
import type { BundleTier } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useAddedFeedback, useTweenedNumber } from "@/components/motion/hooks";

const tiers: BundleTier[] = ["small", "medium", "large"];
const bundles = getAllBundles();

/** Configurador estilo Huel: estancia + tamaño → contenido y precio en vivo, sin salir de la home. */
export default function PackConfigurator() {
  const { addBundle } = useStore();
  const [family, setFamily] = useState<string>(families[0].id);
  const [tier, setTier] = useState<BundleTier>("medium");
  const [added, flash] = useAddedFeedback();
  const bundle = bundles.find((b) => b.category_id === family && b.tier === tier)!;
  const price = useTweenedNumber(calculateBundleTotal(bundle));
  const famIndex = families.findIndex((f) => f.id === family);
  return (
    <div className="configurator" data-reveal>
      <div className="configurator-controls">
        <div className="seg seg-wide" role="radiogroup" aria-label="Estancia" style={{ ["--n" as string]: families.length, ["--idx" as string]: famIndex }}>
          <span className="seg-pill" aria-hidden="true" />
          {families.map((f) => (
            <button key={f.id} role="radio" aria-checked={family === f.id} className={family === f.id ? "selected" : ""} onClick={() => setFamily(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Tamaño" style={{ ["--n" as string]: 3, ["--idx" as string]: tiers.indexOf(tier) }}>
          <span className="seg-pill" aria-hidden="true" />
          {tiers.map((t) => (
            <button key={t} role="radio" aria-checked={tier === t} className={tier === t ? "selected" : ""} onClick={() => setTier(t)}>
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="configurator-body">
        <ul className="configurator-items" key={bundle.id} aria-label={`Contenido de ${bundle.name_es}`}>
          {bundle.product_ids.map((id, i) => {
            const p = getProductById(id);
            return p ? (
              <li key={id} style={{ ["--i" as string]: i }}>
                <ProductVisual categoryId={p.category_id} subcategory={p.subcategory} image={p.image} size="sm" />
                <span>{p.name_es}</span>
              </li>
            ) : null;
          })}
        </ul>
        <div className="configurator-summary">
          <span className="eyebrow">{bundle.name_es}</span>
          <strong className="configurator-price">{formatEuroPrice(price)}</strong>
          <span className="configurator-meta">{bundle.product_ids.length} artículos</span>
          <button
            className={`btn btn-primary btn-lg btn-block ${added ? "is-added" : ""}`}
            onClick={() => {
              addBundle(bundle.id, bundle.tier);
              flash();
            }}
          >
            {added ? <Check size={18} /> : <ShoppingBag size={18} />} {added ? "Añadido" : "Añadir pack"}
          </button>
          <Link className="text-link" href={`/packs/${family}/${tier}`}>
            Ver el pack en detalle <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
