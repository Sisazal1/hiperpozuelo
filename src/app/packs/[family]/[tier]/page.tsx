import { notFound } from "next/navigation";
import PacksExperience from "@/components/packs/PacksExperience";
import { families } from "@/lib/catalog/families";
import { getAllBundles, TIER_LABEL } from "@/lib/catalog/bundles";
import type { BundleTier } from "@/types/catalog";

const valid = (family: string, tier: string) =>
  getAllBundles().some((b) => b.category_id === family && b.tier === tier);

export default async function PackDetailPage({ params }: { params: Promise<{ family: string; tier: string }> }) {
  const { family, tier } = await params;
  if (!valid(family, tier)) notFound();
  return <PacksExperience initialFamily={family} initialTier={tier as BundleTier} />;
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
  return getAllBundles().map((b) => ({ family: b.category_id, tier: b.tier }));
}
