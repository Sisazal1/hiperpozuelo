import type { Metadata } from "next";
import Link from "next/link";
import { ordersEnabled, paymentRules } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { formatEuroPrice } from "@/lib/catalog/pricing";

export const metadata: Metadata = { title: "Condiciones de compra" };

export default function TermsPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Condiciones de compra</h1>
        {siteConfig.prelaunch && <p>Estamos en preapertura: el pago está en modo de prueba, así que no se cobra ni se envía ningún pedido.</p>}

        <h2>Quién vende</h2>
        <p>
          {siteConfig.legalName}
          {siteConfig.taxId ? `, CIF ${siteConfig.taxId}` : ""}
          {siteConfig.address ? `, ${siteConfig.address}` : ""}
          {siteConfig.contact ? `. Contacto: ${siteConfig.contact}` : ""}.
        </p>

        <h2>Precio</h2>
        <p>Los precios incluyen IVA. Los gastos de envío y cualquier suplemento se muestran antes de confirmar. El precio de un pack es la suma de lo que incluye.</p>

        <h2>Pedido</h2>
        <p>
          El contrato se formaliza cuando confirmas el pago
          {ordersEnabled ? ", o cuando pulsas «Pedido con obligación de pago» si pagas al recibirlo. Recibes un código de pedido y un enlace de seguimiento en pantalla." : ". Ves la confirmación en pantalla."} Si un producto no
          está disponible, te ofrecemos quitarlo o cancelar, con el reembolso de lo pagado.
        </p>

        <h2>Pago</h2>
        <p>
          {ordersEnabled
            ? `Puedes pagar online a través de Stripe, al recoger en tienda o contra reembolso hasta ${formatEuroPrice(paymentRules.codMax)}. Un mismo teléfono puede tener como máximo ${paymentRules.maxOpenUnpaid} pedidos sin pagar. `
            : "El pago es online, a través de Stripe. "}<Link href="/pago-seguro">Más sobre el pago</Link>.
        </p>

        <h2>Entrega, desistimiento y garantía</h2>
        <p>
          Las zonas, los costes, el derecho de desistimiento de 14 días y la garantía legal están en <Link href="/envios-y-devoluciones">envíos y devoluciones</Link>.
        </p>

        <h2>Reclamaciones</h2>
        <p>
          Puedes pedir hojas de reclamaciones en la tienda o acudir a los servicios de consumo de tu comunidad. Estas condiciones se rigen por la ley española y no limitan los derechos que te da como
          consumidor.
        </p>
      </div>
    </div>
  );
}
