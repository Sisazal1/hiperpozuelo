export type DeliveryMethod = "delivery" | "collect";

/** Hay base de datos: seguimiento, pago al recibir y desistimiento online. Ver next.config.ts. */
export const ordersEnabled = process.env.NEXT_PUBLIC_ORDERS === "1";

export const commerceConfig = {
  collectionFee: 0,
  standardShippingFee: 3.99,
  freeShippingThreshold: 30,
  currency: "EUR" as const,
  welcomeDiscountCode: "BIENVENIDA10",
  welcomeDiscountRate: 0.1,
};

// Alcance hiperlocal de la D1: Pozuelo de Alarcón (28223, 28224) y Aravaca (28023, Madrid).
export const deliveryZones: Record<string, string> = {
  "28223": "Pozuelo de Alarcón",
  "28224": "Pozuelo de Alarcón",
  "28023": "Aravaca, Madrid",
};
export const normalizePostalCode = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(0, 5);
export const zoneFor = (cp: unknown): string | null => deliveryZones[normalizePostalCode(cp)] ?? null;

export const paymentRules = {
  maxLineQuantity: 99,
  /** Importe desde el que se ofrece pago aplazado: por debajo no aporta y encarece. */
  klarnaMin: 35,
  /** Contra reembolso: tope para limitar pedidos falsos y efectivo en ruta. */
  codMax: 100,
  /** Suplemento por contra reembolso, en euros. 0 hasta cerrar tarifa con el courier. */
  codSurcharge: 0,
  /** Pedidos sin pagar que un mismo teléfono puede tener abiertos a la vez. */
  maxOpenUnpaid: 2,
  /** Desde aquí se pide 3-D Secure siempre, no solo cuando el banco lo exige. */
  force3dsFrom: 100,
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
