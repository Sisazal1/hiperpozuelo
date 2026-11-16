export type DeliveryMethod = "delivery" | "collect";

export const commerceConfig = {
  collectionFee: 0,
  standardShippingFee: 3.99,
  freeShippingThreshold: 30,
  currency: "EUR" as const,
  welcomeDiscountCode: "BIENVENIDA10",
  welcomeDiscountRate: 0.1,
};

export function calculateDiscount(subtotal: number, code?: string) {
  return code?.trim().toUpperCase() === commerceConfig.welcomeDiscountCode
    ? Math.round(subtotal * commerceConfig.welcomeDiscountRate * 100) / 100
    : 0;
}

export function calculateOrderTotals(subtotal: number, deliveryMethod: DeliveryMethod, discount = 0) {
  const discountAmount = Math.max(0, Math.min(subtotal, typeof discount === "number" ? discount : 0));
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const shippingCost =
    deliveryMethod === "collect"
      ? commerceConfig.collectionFee
      : discountedSubtotal >= commerceConfig.freeShippingThreshold
        ? 0
        : commerceConfig.standardShippingFee;
  return {
    subtotal,
    discount: discountAmount,
    discountedSubtotal,
    shippingCost,
    finalTotal: discountedSubtotal + shippingCost,
  };
}

export function shippingProgress(subtotal: number) {
  return Math.min(100, (subtotal / commerceConfig.freeShippingThreshold) * 100);
}
