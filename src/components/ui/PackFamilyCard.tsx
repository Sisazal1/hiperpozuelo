import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryVisual } from "./ProductVisual";
import { calculateBundleTotal, getFamilyBundles, getFamilyFromPrice, tierLabels, type packFamilies } from "@/lib/catalog/bundles";
import { formatEuroPrice } from "@/lib/catalog/pricing";

type Family = (typeof packFamilies)[number];

/** A pack family with all three sizes visible, so customers compare before entering a pack. */
export function PackFamilyCard({ family, variant = "full" }: { family: Family; variant?: "full" | "compact" }) {
  const bundles = getFamilyBundles(family.id);
  const entry = bundles.find((b) => b.tier === "medium") ?? bundles[0];
  return (
    <article className={`pack-card pack-card--${variant}`} id={family.id}>
      <Link className="pack-card__media" href={entry ? `/packs/${family.id}/${entry.tier}` : "/packs"} tabIndex={-1} aria-hidden="true">
        <CategoryVisual id={family.id} size={variant === "compact" ? 34 : 44} />
      </Link>
      <div className="pack-card__body">
        <h3 className="pack-card__title">
          <Link href={entry ? `/packs/${family.id}/${entry.tier}` : "/packs"}>Pack {family.label}</Link>
        </h3>
        <p className="pack-card__intro">{family.intro}</p>
        {variant === "full" && (
          <ul className="pack-card__sizes">
            {bundles.map((bundle) => (
              <li key={bundle.id}>
                <Link href={`/packs/${family.id}/${bundle.tier}`}>
                  <span>
                    <strong>{tierLabels[bundle.tier]}</strong>
                    <small>{bundle.product_ids.length} artículos</small>
                  </span>
                  <span className="price">{formatEuroPrice(calculateBundleTotal(bundle))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="pack-card__foot">
          <span className="pack-card__from">
            Desde <strong className="price">{formatEuroPrice(getFamilyFromPrice(family.id))}</strong>
          </span>
          <Link className="link-arrow" href={entry ? `/packs/${family.id}/${entry.tier}` : "/packs"}>
            Ver pack <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
