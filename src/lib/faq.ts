import { commerceConfig, ordersEnabled, paymentRules } from "@/config/commerce";
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
  { q: "¿Dónde repartís?", a: "En Pozuelo de Alarcón (28223 y 28224) y Aravaca (28023). Si vives fuera, puedes recogerlo gratis en tienda." },
  ...(ordersEnabled
    ? [{ q: "¿Puedo pagar al recibirlo?", a: `Sí: al recoger en tienda, o contra reembolso en pedidos a domicilio de hasta ${formatEuroPrice(paymentRules.codMax)}.` }]
    : []),
  { q: "¿Qué lleva cada pack?", a: "Lo ves producto a producto antes de comprar. El precio del pack es la suma de lo que incluye: sin letra pequeña.", home: true },
  { q: "¿Cómo se paga?", a: `Online con tarjeta y los demás métodos que ves al pagar, a través de Stripe${ordersEnabled ? "; al recoger en tienda; o contra reembolso al recibirlo" : ""}. Sin crear cuenta.`, home: true },
  { q: "¿Puedo devolver un producto?", a: "Tienes 14 días naturales para desistir de la compra, con las excepciones que marca la ley.", home: true },
  ...(siteConfig.deliveryTime || ordersEnabled
    ? [{ q: "¿Cuándo recibiré mi pedido?", a: siteConfig.deliveryTime ?? "Puedes ver en qué punto está en «Seguir mi pedido», con tu código y el email o teléfono de la compra." }]
    : []),
  { q: "¿Necesito una cuenta?", a: ordersEnabled ? "No. Compras como invitado y sigues el pedido con su código. Tu cesta y favoritos se guardan en este navegador." : "No. Compras como invitado. Tu cesta y favoritos se guardan en este navegador." },
];
