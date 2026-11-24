// Vocabulario único de pedidos: lo comparten servidor, backoffice y seguimiento del cliente.
export type OrderStatus =
  | "awaiting_payment"
  | "received"
  | "preparing"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "abandoned"
  | "returned";
export type PaymentStatus = "pending" | "collected" | "verified" | "failed" | "partially_refunded" | "refunded";
export type PaymentMode = "online" | "pickup" | "cod" | "pos";
export type Delivery = "delivery" | "collect" | "counter";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Esperando pago",
  received: "Recibido",
  preparing: "En preparación",
  ready: "Listo para recoger",
  shipped: "En reparto",
  delivered: "Entregado",
  cancelled: "Cancelado",
  abandoned: "Abandonado",
  returned: "Devuelto",
};
export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Sin cobrar",
  collected: "Cobrado, por verificar",
  verified: "Verificado",
  failed: "Pago fallido",
  partially_refunded: "Reembolso parcial",
  refunded: "Reembolsado",
};
/** Al cliente se le dice qué le toca hacer, no nuestro estado interno. */
export function publicPaymentLabel(status: PaymentStatus, mode: PaymentMode) {
  if (status === "pending") return mode === "cod" ? "Pagas al repartidor" : mode === "pickup" ? "Pagas al recoger" : "Pago no completado";
  if (status === "collected" || status === "verified") return "Pagado";
  return PAYMENT_LABEL[status];
}
export const MODE_LABEL: Record<PaymentMode, string> = {
  online: "Pago online",
  pickup: "Pago al recoger",
  cod: "Contra reembolso",
  pos: "Pago en tienda",
};
export const DELIVERY_LABEL: Record<Delivery, string> = {
  delivery: "Envío a domicilio",
  collect: "Recogida en tienda",
  counter: "Venta en mostrador",
};

/** Pasos que ve el cliente según el tipo de entrega. */
export const STEPS: Record<Delivery, OrderStatus[]> = {
  delivery: ["received", "preparing", "shipped", "delivered"],
  collect: ["received", "preparing", "ready", "delivered"],
  counter: ["delivered"],
};

export function nextStatuses(status: OrderStatus, delivery: Delivery): OrderStatus[] {
  if (status === "awaiting_payment") return ["cancelled"];
  if (status === "delivered") return ["returned"];
  const steps = STEPS[delivery];
  const i = steps.indexOf(status);
  if (i < 0) return [];
  return [...steps.slice(i + 1, i + 2), "cancelled"];
}

export const TENDERS = {
  card: "Tarjeta",
  bizum: "Bizum",
  cash: "Efectivo",
  courier: "Liquidación del courier",
  stripe: "Stripe",
} as const;
export type Tender = keyof typeof TENDERS;
/** Sin número de operación no hay forma de casar el cobro con el banco: no se puede verificar. */
export const NEEDS_REFERENCE: Tender[] = ["card", "bizum", "courier", "stripe"];

// `cod`: admite contra reembolso. Las condiciones y tarifas se cierran con cada empresa.
export const COURIERS: { id: string; name: string; cod: boolean; track?: (n: string) => string }[] = [
  { id: "propio", name: "Reparto propio", cod: true },
  { id: "seur", name: "SEUR", cod: true, track: () => "https://www.seur.com/es/particulares/seguimiento/" },
  { id: "mrw", name: "MRW", cod: true, track: () => "https://www.mrw.es/seguimiento_envios/" },
  {
    id: "correos",
    name: "Correos",
    cod: true,
    track: (n) => `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${encodeURIComponent(n)}`,
  },
  { id: "gls", name: "GLS", cod: true, track: () => "https://gls-group.com/ES/es/seguimiento-envio/" },
];
export const courierById = (id?: string | null) => COURIERS.find((c) => c.id === id) ?? null;

export const euros = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
