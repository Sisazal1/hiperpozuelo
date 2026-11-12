export type DeliveryMethod = "delivery" | "collect";

export const commerceConfig = {
  collectionFee: 0,
  standardShippingFee: 3.99,
  freeShippingThreshold: 30,
  currency: "EUR" as const,
};

export function calculateOrderTotals(subtotal: number, deliveryMethod: DeliveryMethod) {
  const shippingCost = deliveryMethod === "collect"
    ? commerceConfig.collectionFee
    : subtotal >= commerceConfig.freeShippingThreshold ? 0 : commerceConfig.standardShippingFee;
  return { subtotal, shippingCost, finalTotal: subtotal + shippingCost };
}

export function shippingProgress(subtotal: number) {
  return Math.min(100, (subtotal / commerceConfig.freeShippingThreshold) * 100);
}
