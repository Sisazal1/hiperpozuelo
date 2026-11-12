import PacksExperience from "@/components/packs/PacksExperience";
import type { BundleTier } from "@/types/catalog";

export default async function PackDetailPage({ params }: { params: Promise<{ family: string; tier: string }> }) {
  const { family, tier } = await params;
  return <PacksExperience initialFamily={family} initialTier={tier as BundleTier} />;
}
