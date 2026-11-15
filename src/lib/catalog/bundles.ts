import { catalog } from "./index";
import { getProductById } from "./products";
import { roundMoney } from "@/config/commerce";
import type { Bundle, BundleTier } from "@/types/catalog";

export const packFamilies = [
  { id: "kitchen", label: "Cocina", intro: "Utensilios y accesorios para preparar tu día a día." },
  { id: "bathroom", label: "Baño", intro: "Una selección práctica para mantener el baño equipado." },
  { id: "cleaning", label: "Limpieza", intro: "Soluciones esenciales para las tareas de casa." },
  { id: "stationery", label: "Estudio", intro: "Material para estudiar, organizar y trabajar." },
] as const;

export type PackFamilyId = (typeof packFamilies)[number]["id"];

export const packTiers: BundleTier[] = ["small", "medium", "large"];
export const tierLabels: Record<BundleTier, string> = { small: "Pequeño", medium: "Mediano", large: "Grande" };

export const getAllBundles = () => catalog.bundles;
export const getBundleById = (id: string) => catalog.bundles.find((b) => b.id === id);
export const getBundlesByCategory = (categoryId: string) => catalog.bundles.filter((b) => b.category_id === categoryId);
export const getBundle = (family: string, tier: string) =>
  catalog.bundles.find((b) => b.category_id === family && b.tier === tier);
export const getPackFamily = (id: string) => packFamilies.find((f) => f.id === id);

export const calculateBundleTotal = (bundle: Bundle | string) => {
  const item = typeof bundle === "string" ? getBundleById(bundle) : bundle;
  if (!item) return 0;
  return roundMoney(item.product_ids.reduce((sum, id) => sum + (getProductById(id)?.proposed_price_eur ?? 0), 0));
};

/** Spanish display title, e.g. "Pack Cocina Pequeño" (the seed names are English). */
export const getBundleTitle = (bundle: Bundle) =>
  `Pack ${getPackFamily(bundle.category_id)?.label ?? bundle.category_id} ${tierLabels[bundle.tier]}`;

export const getFamilyBundles = (family: string) =>
  packTiers.map((tier) => getBundle(family, tier)).filter((b): b is Bundle => Boolean(b));

export const getFamilyFromPrice = (family: string) => {
  const prices = getFamilyBundles(family).map(calculateBundleTotal);
  return prices.length ? Math.min(...prices) : 0;
};

/** Next size up in the same family, used for a real (data-driven) upsell. */
export const getUpgradeBundle = (bundle: Bundle) => {
  const next = packTiers[packTiers.indexOf(bundle.tier) + 1];
  return next ? getBundle(bundle.category_id, next) : undefined;
};
