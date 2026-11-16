import type { Bundle, BundleTier } from "@/types/catalog";
import { getAllBundles, calculateBundleTotal } from "./bundles";

export const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function getBundlePricing(bundle: Bundle) {
  const productTotal = roundCents(calculateBundleTotal(bundle));
  const packTotal = roundCents(bundle.estimated_total_eur);
  return {
    productTotal,
    packTotal,
    itemCount: bundle.product_ids.length,
    pricePerItem: roundCents(packTotal / Math.max(1, bundle.product_ids.length)),
  };
}
export function getFamilyPricing(categoryId: string) {
  const byTier = Object.fromEntries(
    getAllBundles()
      .filter((bundle) => bundle.category_id === categoryId)
      .map((bundle) => [bundle.tier, getBundlePricing(bundle)]),
  ) as Partial<Record<BundleTier, ReturnType<typeof getBundlePricing>>>;
  const prices = Object.values(byTier)
    .filter(Boolean)
    .map((item) => item!.packTotal);
  return { byTier, from: prices.length ? Math.min(...prices) : 0 };
}
