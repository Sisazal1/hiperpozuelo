import type { Metadata } from "next";
import Link from "next/link";
import { ordersEnabled, paymentRules } from "@/config/commerce";
import { subscriptionConfig } from "@/config/subscription";
import { reviewConfig } from "@/config/reviews";
import { pointsConfig, pointsLabel } from "@/config/points";
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

        {ordersEnabled && (
          <>
            <h2 id="suscripcion">Suscripción de reposición</h2>
            <p>
              Eliges artículos de reposición, cantidades y una frecuencia de {subscriptionConfig.weeksText} semanas. Se aplica un {subscriptionConfig.discountRate * 100} % de descuento sobre los productos, con un mínimo de{" "}
              {formatEuroPrice(subscriptionConfig.minAfterDiscount)} por ciclo después del descuento. No se acumula con el código de bienvenida ni con el canje de puntos.
            </p>
            <p>
              El primer cobro se hace al suscribirte y los siguientes, en la misma tarjeta, al cumplirse la frecuencia elegida. Dura hasta que la canceles, sin permanencia ni penalización. Desde tu enlace de gestión o tu
              cuenta puedes saltar el próximo ciclo, pausarla, cambiarla o cancelarla en dos clics; lo ya cobrado sigue su curso. Si un cobro se rechaza, no preparamos ese ciclo hasta que se complete. Si falta un artículo,
              te ofrecemos quitarlo o cancelar ese ciclo, con el reembolso de lo pagado. El precio aceptado no cambia sin que tú lo aceptes.
            </p>
            <p>Puedes desistir de cada pedido en los 14 días siguientes a recibirlo, con las excepciones de ley.</p>
          </>
        )}

        <h2>Entrega, desistimiento y garantía</h2>
        <p>
          Las zonas, los costes, el derecho de desistimiento de 14 días y la garantía legal están en <Link href="/envios-y-devoluciones">envíos y devoluciones</Link>.
        </p>

        {ordersEnabled && (
          <>
            <h2 id="puntos">Bases de {pointsConfig.name}</h2>
            <p>
              Programa gratuito y solo para quien tiene cuenta. Sumas {pointsLabel(pointsConfig.perEuro)} por cada euro pagado en productos, después de descuentos y sin contar el envío, redondeando hacia abajo en cada
              pedido. También en cada ciclo de suscripción.
            </p>
            <p>
              Los puntos quedan pendientes al pagar y se pueden usar {pointsConfig.maturityDays} días después de la entrega o recogida. {pointsConfig.reward.points} puntos son {formatEuroPrice(pointsConfig.reward.euros)} de
              descuento en productos, un canje por pedido, desde {formatEuroPrice(pointsConfig.minSubtotal)} en productos. No se acumula con códigos de descuento. El envío gratis se calcula después de aplicar los puntos. No
              se cambian por dinero ni se transfieren.
            </p>
            <p>
              Si devuelves un pedido, entero o en parte, se restan en la misma proporción; si ya los habías usado, se descuentan de los siguientes. Si se cancela o se reembolsa entero, te devolvemos los que canjeaste. Caducan tras {pointsConfig.expiryMonths} meses sin compras: ves
              la fecha en tu cuenta. Un pedido hecho sin cuenta suma si lo añades a la tuya en los {pointsConfig.linkDays} días siguientes a la compra, una sola vez por pedido. Al eliminar la cuenta se pierden. Los puntos de
              pedidos de prueba no pasan a la tienda real.
            </p>

            <h2 id="resenas">Reseñas</h2>
            <p>
              Solo puede opinar quien tiene en su cuenta un pedido entregado o recogido que contiene el artículo, hasta {reviewConfig.days} días naturales después. Lo comprobamos de forma automática antes de guardar cada
              reseña. Hay una por artículo y pedido, y su autor puede editarla o borrarla.
            </p>
            <p>
              Publicamos todas, positivas y negativas, y la media cuenta todas las publicadas. No pagamos ni premiamos opiniones. Solo retiramos las que son spam, insultan, muestran datos personales o son ilegales; el motivo queda
              registrado y su autor lo ve. La tienda puede responder en público. Las de pedidos de prueba no se publican ni cuentan.
            </p>
          </>
        )}

        <h2>Reclamaciones</h2>
        <p>
          Puedes pedir hojas de reclamaciones en la tienda o acudir a los servicios de consumo de tu comunidad. Estas condiciones se rigen por la ley española y no limitan los derechos que te da como
          consumidor.
        </p>
      </div>
    </div>
  );
}
