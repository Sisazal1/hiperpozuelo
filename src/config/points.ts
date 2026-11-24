/**
 * Puntos Hiper: todos los valores del programa, solo aquí.
 * Es una propuesta de estrategia sin margen validado: cambiarla aquí la cambia en toda la web y en las bases.
 */
export const pointsConfig = {
  name: "Puntos Hiper",
  /** Puntos por cada euro pagado en productos, tras descuentos y sin envío. */
  perEuro: 1,
  /** Un canje por pedido. */
  reward: { points: 50, euros: 2 },
  /** Subtotal mínimo de productos para canjear, en euros. */
  minSubtotal: 10,
  /** Días tras la entrega o recogida hasta que se pueden usar. */
  maturityDays: 14,
  /** Meses sin compras tras los que caducan. */
  expiryMonths: 12,
  /** Días desde la compra para vincular un pedido de invitado y que sume. */
  linkDays: 30,
} as const;

/** Puntos de una compra: importe de productos ya descontado, en céntimos. Redondea hacia abajo. */
export const pointsFor = (goodsCents: number) => Math.max(0, Math.floor((goodsCents / 100) * pointsConfig.perEuro + 1e-9));
export const pointsLabel = (n: number) => `${n} ${n === 1 ? "punto" : "puntos"}`;
export const rewardCents = Math.round(pointsConfig.reward.euros * 100);
export const rewardCode = `${pointsConfig.reward.points} puntos`;
