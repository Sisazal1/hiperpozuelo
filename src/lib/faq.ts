import { commerceConfig } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { formatEuroPrice } from "@/lib/catalog/pricing";

const free = formatEuroPrice(commerceConfig.freeShippingThreshold);

// Fuente única de preguntas frecuentes (home y /faq). Solo datos confirmados en config.
export const FAQ: { q: string; a: string; home?: boolean }[] = [
  ...(siteConfig.prelaunch
    ? [{ q: "¿Puedo comprar ya?", a: "Puedes preparar tu cesta y probar el pago. Estamos en preapertura: la pasarela está en modo prueba, así que todavía no se cobra ni se envía ningún pedido." }]
    : []),
  { q: "¿Cuándo es gratis el envío?", a: `En pedidos desde ${free}, después de aplicar descuentos. Si no, el envío a domicilio cuesta ${formatEuroPrice(commerceConfig.standardShippingFee)}.`, home: true },
  { q: "¿Puedo recoger mi compra?", a: "Sí. La recogida en tienda es gratis; la eliges al finalizar la compra.", home: true },
  { q: "¿Qué lleva cada pack?", a: "Lo ves producto a producto antes de comprar. El precio del pack es la suma de lo que incluye: sin letra pequeña.", home: true },
  { q: "¿Cómo se paga?", a: "Con tarjeta a través de Stripe, sin crear cuenta. Tus datos de pago los gestiona Stripe, nunca nosotros.", home: true },
  { q: "¿Puedo devolver un producto?", a: "Tienes 14 días naturales para desistir de la compra, con las excepciones que marca la ley.", home: true },
  { q: "¿Cuándo recibiré mi pedido?", a: siteConfig.deliveryTime ?? "Te confirmaremos el plazo de entrega por email al procesar el pedido." },
  { q: "¿Necesito una cuenta?", a: "No. Compras como invitado y el recibo te llega por email. Tu cesta y favoritos se guardan en este navegador." },
];
