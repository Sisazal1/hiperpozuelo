import type { Metadata } from "next";
import Link from "next/link";
import OnlineMarks from "./OnlineMarks";
import { ordersEnabled, paymentRules } from "@/config/commerce";
import { formatEuroPrice } from "@/lib/catalog/pricing";

export const metadata: Metadata = {
  title: "Pago seguro",
  description: "Formas de pago, autenticación, pagos rechazados, cargos que no reconoces y reembolsos en Hiper Pozuelo.",
};

export default function SafePaymentPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Ayuda</span>
        <h1>Pago seguro</h1>

        <h2>Cómo puedes pagar</h2>
        <dl className="info-list">
          <div>
            <dt>Ahora, online</dt>
            <dd>
              <OnlineMarks />
            </dd>
          </div>
          {ordersEnabled && (
            <>
              <div>
                <dt>Al recoger en tienda</dt>
                <dd>Tarjeta, Bizum o efectivo en el mostrador.</dd>
              </div>
              <div>
                <dt>Contra reembolso</dt>
                <dd>Al repartidor, en pedidos de hasta {formatEuroPrice(paymentRules.codMax)}.</dd>
              </div>
            </>
          )}
        </dl>

        <h2>Tus datos de tarjeta no pasan por nuestra tienda</h2>
        <p>
          Al pagar online te llevamos a la página cifrada de Stripe. Nosotros solo recibimos el resultado y un número de pago. No guardamos tarjetas y el importe se recalcula en el servidor antes de
          cobrar.
        </p>

        <h2>Tu banco confirma que eres tú</h2>
        <p>
          La normativa europea de pagos pide autenticación reforzada: tu banco puede pedirte confirmar la compra en su app, con huella o con un código. Si no la completas, no se cobra. En compras desde{" "}
          {formatEuroPrice(paymentRules.force3dsFrom)} la pedimos siempre.
        </p>

        <h2>Si el pago falla</h2>
        <p>
          Tu cesta se conserva. Puedes repetir con otra tarjeta o elegir otro método. Si tu banco muestra una retención de un pago rechazado, la libera el propio banco.
          {ordersEnabled ? " Antes de repetir un pago que no sabes si entró, mira su estado." : ""}
        </p>
        {ordersEnabled && (
          <Link href="/pedido" className="btn btn-secondary">
            Ver mi pedido
          </Link>
        )}

        <h2>Si ves algo raro</h2>
        <p>
          Cada pago se analiza con el sistema antifraude de Stripe. {ordersEnabled ? "Si un cobro no cuadra, el pedido se para hasta que lo revisamos. " : ""} Nunca te pediremos por teléfono, email o WhatsApp tu PIN, el código de tu
          banco ni la tarjeta completa, ni cobramos con un QR pegado en la calle.
        </p>

        <h2>Si no reconoces un cargo</h2>
        <ol>
          <li>Compara el importe y la fecha con tu pedido.</li>
          <li>Si no es tuyo, bloquea la tarjeta y avisa a tu banco. Puedes pedir la devolución del cargo.</li>
          <li>Si el banco abre una reclamación, aportamos el pedido, la entrega y el número de pago.</li>
        </ol>

        <h2>Reembolsos</h2>
        <p>
          Se hacen por el mismo medio con el que pagaste{ordersEnabled ? " y quedan anotados en la página de tu pedido, con su importe" : ""}. <Link href="/envios-y-devoluciones">Cómo devolver un producto</Link>.
        </p>
      </div>
    </div>
  );
}
