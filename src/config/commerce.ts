export type DeliveryMethod = "delivery" | "collect";

/**
 * Commercial rules. Every price shown in the cart, drawer, checkout and the
 * confirmation comes from calculateOrderTotals(), so totals can never disagree.
 */
export const commerceConfig = {
  currency: "EUR" as const,
  collectionFee: 0,
  standardShippingFee: 3.99,
  freeShippingThreshold: 30,
};

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateShipping(subtotal: number, method: DeliveryMethod) {
  if (method === "collect") return commerceConfig.collectionFee;
  return subtotal >= commerceConfig.freeShippingThreshold ? 0 : commerceConfig.standardShippingFee;
}

export function calculateOrderTotals(subtotal: number, method: DeliveryMethod) {
  const clean = roundMoney(subtotal);
  const shippingCost = calculateShipping(clean, method);
  return { subtotal: clean, shippingCost, finalTotal: roundMoney(clean + shippingCost) };
}

export const amountToFreeShipping = (subtotal: number) =>
  Math.max(0, roundMoney(commerceConfig.freeShippingThreshold - subtotal));

export const shippingProgress = (subtotal: number) =>
  Math.min(100, Math.max(0, (subtotal / commerceConfig.freeShippingThreshold) * 100));
