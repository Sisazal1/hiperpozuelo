import { calculateOrderTotals, type DeliveryMethod } from "@/config/commerce";
import { getProductById } from "@/lib/catalog/products";

/** Suscripción de reposición: reglas del programa, en un solo sitio. */
export const subscriptionConfig = {
  eligible: ["HP-CLE-001", "HP-CLE-003", "HP-CLE-004", "HP-CLE-006"],
  /** Descuento decidido por el equipo (Delivery 4). */
  discountRate: 0.1,
  weeks: [4, 6, 8],
  weeksText: "4, 6 u 8",
  defaultWeeks: 4,
  /** Mínimo por ciclo, en euros y después del descuento. */
  minAfterDiscount: 5,
  /** Antelación del aviso previo a cada cobro. */
  noticeDays: 15,
  maxQuantity: 20,
} as const;

export type SubItem = { id: string; n: number };
export const isEligible = (id: string) => (subscriptionConfig.eligible as readonly string[]).includes(id);

/** Entrada de cliente → artículos válidos, o null. */
export function cleanItems(input: unknown): SubItem[] | null {
  if (!Array.isArray(input)) return null;
  const out = new Map<string, number>();
  for (const raw of input) {
    const id = (raw as SubItem)?.id;
    const n = Number((raw as SubItem)?.n);
    if (typeof id !== "string" || !isEligible(id) || !Number.isInteger(n) || n < 0 || n > subscriptionConfig.maxQuantity) return null;
    if (n) out.set(id, n);
  }
  return [...out].map(([id, n]) => ({ id, n }));
}
export const cleanWeeks = (v: unknown) => ((subscriptionConfig.weeks as readonly number[]).includes(Number(v)) ? Number(v) : null);

export type Priced = { id: string; name: string; unit: number; n: number };
export const pricedItems = (items: SubItem[]): Priced[] =>
  items.map(({ id, n }) => {
    const p = getProductById(id)!;
    return { id, name: p.name_es, unit: Math.round(p.proposed_price_eur * 100), n };
  });

/** Importes en céntimos. El descuento se calcula sobre el total, no artículo a artículo. */
export function subscriptionQuote(items: Priced[], delivery: DeliveryMethod) {
  const subtotal = items.reduce((s, i) => s + i.unit * i.n, 0);
  const discount = Math.round(subtotal * subscriptionConfig.discountRate);
  const goods = subtotal - discount;
  const shipping = goods ? Math.round(calculateOrderTotals(subtotal / 100, delivery, discount / 100).shippingCost * 100) : 0;
  const min = subscriptionConfig.minAfterDiscount * 100;
  return { subtotal, discount, goods, shipping, total: goods + shipping, missing: Math.max(0, min - goods) };
}
export const discountedUnit = (cents: number) => Math.round(cents * (1 - subscriptionConfig.discountRate));
export const weeksLabel = (w: number) => `Cada ${w} semanas`;
