// Registro local (solo este navegador) de pedidos ya pagados y confirmados por Stripe.
export type LocalOrder = { id: string; createdAt: string; amount: number; items: number; delivery: "delivery" | "collect" };
const KEY = "hp-orders";

export function readLocalOrders(): LocalOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((o) => o && typeof o.id === "string") : [];
  } catch {
    return [];
  }
}

export function saveLocalOrder(order: LocalOrder) {
  try {
    const list = readLocalOrders().filter((o) => o.id !== order.id);
    localStorage.setItem(KEY, JSON.stringify([order, ...list].slice(0, 20)));
  } catch {}
}
