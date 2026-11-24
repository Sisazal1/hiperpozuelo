// Accesos directos a pedidos hechos desde este navegador. El estado real vive en el servidor (/pedido/[token]).
export type LocalOrder = {
  id: string;
  code?: string;
  token?: string;
  createdAt: string;
  amount: number;
  items: number;
  delivery: "delivery" | "collect";
};
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
