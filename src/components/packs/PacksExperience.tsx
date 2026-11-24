"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getAllBundles, calculateBundleTotal, TIER_LABEL } from "@/lib/catalog/bundles";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import type { BundleTier } from "@/types/catalog";

import { families } from "@/lib/catalog/families";
const tiers: BundleTier[] = ["small", "medium", "large"];

export default function PacksOverview() {
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
