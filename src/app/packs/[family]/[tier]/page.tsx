import { notFound } from "next/navigation";
import PackDetail from "@/components/packs/PackDetail";
import { families } from "@/lib/catalog/families";
import { calculateBundleTotal, getAllBundles, TIER_LABEL } from "@/lib/catalog/bundles";
import { reviewData } from "@/lib/server/reviews";

export const revalidate = 600;

export default async function PackDetailPage({ params }: { params: Promise<{ family: string; tier: string }> }) {
  const { family, tier } = await params;
  const bundle = getAllBundles().find((b) => b.category_id === family && b.tier === tier);
  if (!bundle) notFound();
  const reviews = await reviewData("bundle", bundle.id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: bundle.name_es,
    description: bundle.description_es,
    sku: bundle.id,
    ...(reviews.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count, bestRating: 5, worstRating: 1 } } : {}),
    offers: { "@type": "Offer", price: calculateBundleTotal(bundle), priceCurrency: "EUR", availability: "https://schema.org/PreOrder" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PackDetail key={bundle.id} familyId={family} bundle={bundle} reviews={reviews} />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ family: string; tier: string }> }) {
  const { family, tier } = await params;
  const f = families.find((x) => x.id === family);
  const b = getAllBundles().find((x) => x.category_id === family && x.tier === tier);
  if (!f || !b) return { title: "Pack no encontrado" };
  return {
    title: `Pack ${f.label} ${TIER_LABEL[b.tier].toLowerCase()}`,
    description: `${f.intro} ${b.product_ids.length} artículos. ${b.description_es}`,
  };
}

export function generateStaticParams() {
  return [] as { family: string; tier: string }[];
}
