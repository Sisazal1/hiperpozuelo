// ÚNICO módulo de importes de la cesta. Lo usan el store, el drawer, /cart, /checkout y el
// endpoint de Stripe: si un importe cambia aquí, cambia igual en todas partes.
import { getProductById } from "@/lib/catalog/products";
import { getBundleById, calculateBundleTotal } from "@/lib/catalog/bundles";
import { calculateDiscount, calculateOrderTotals, commerceConfig, paymentRules, type DeliveryMethod } from "@/config/commerce";

export type PricedLineInput = {
  type: "product" | "bundle" | "custom_bundle";
  productId?: string;
  bundleId?: string;
  productIds?: string[];
  quantities?: Record<string, number>;
  quantity?: number;
};

const cents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Precio de UNA unidad de la línea (un producto, un pack o un pack personalizado). null si no es válida. */
export function lineUnitPrice(line: PricedLineInput): number | null {
  if (line.type === "product") {
    const p = line.productId ? getProductById(line.productId) : undefined;
    return p ? p.proposed_price_eur : null;
  }
  if (line.type === "bundle") {
    const b = line.bundleId ? getBundleById(line.bundleId) : undefined;
    return b ? calculateBundleTotal(b) : null;
  }
  const ids = line.productIds || [];
  if (!ids.length) return null;
  let sum = 0;
  for (const id of ids) {
    const p = getProductById(id);
    if (!p) return null;
    sum += p.proposed_price_eur * Math.max(0, Math.floor(line.quantities?.[id] || 0));
  }
  return sum > 0 ? cents(sum) : null;
}

export const lineQuantity = (line: PricedLineInput) => 
  Math.min(paymentRules.maxLineQuantity, Math.max(1, Math.floor(Number(line.quantity) || 1)));

export function lineTotal(line: PricedLineInput) {
  const unit = lineUnitPrice(line);
  return unit === null ? 0 : cents(unit * lineQuantity(line));
}

export function cartSubtotal(lines: PricedLineInput[]) {
  return cents(lines.reduce((sum, l) => sum + lineTotal(l), 0));
}

/** Resumen completo. El envío gratis se decide SIEMPRE sobre el subtotal ya descontado. */
export function cartSummary(lines: PricedLineInput[], discountCode = "", delivery: DeliveryMethod = "delivery", pointsDiscount = 0) {
  const subtotal = cartSubtotal(lines);
  const discount = pointsDiscount || calculateDiscount(subtotal, discountCode);
  const totals = calculateOrderTotals(subtotal, delivery, discount);
  const threshold = commerceConfig.freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, cents(threshold - totals.discountedSubtotal));
  return {
    ...totals,
    finalTotal: cents(totals.finalTotal),
    freeShippingThreshold: threshold,
    remainingForFreeShipping,
    freeShippingReached: remainingForFreeShipping === 0 && subtotal > 0,
    freeShippingProgress: Math.min(100, (totals.discountedSubtotal / threshold) * 100),
  };
}
