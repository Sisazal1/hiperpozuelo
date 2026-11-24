import type { Metadata } from "next";
import Link from "next/link";
import { commerceConfig, deliveryZones, ordersEnabled, paymentRules } from "@/config/commerce";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Envíos y devoluciones",
  description: "Zonas de reparto, costes, recogida gratis y devoluciones en Hiper Pozuelo.",
};

const zones = Object.entries(
  Object.entries(deliveryZones).reduce<Record<string, string[]>>((a, [cp, name]) => ({ ...a, [name]: [...(a[name] ?? []), cp] }), {}),
);

export default function ShippingPage() {
  const fee = formatEuroPrice(commerceConfig.standardShippingFee);
  const free = formatEuroPrice(commerceConfig.freeShippingThreshold);
  const max = formatEuroPrice(paymentRules.codMax);
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Ayuda</span>
        <h1>Envíos y devoluciones</h1>

        <h2>Cómo recibirlo</h2>
        <div className="info-table" tabIndex={0} role="region" aria-label="Opciones de entrega">
          <table>
            <thead>
              <tr>
                <th scope="col">Opción</th>
                <th scope="col">Coste</th>
                <th scope="col">Cuándo pagas</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Recogida en tienda</th>
                <td>Gratis</td>
                <td>{ordersEnabled ? "Online, o al recoger con tarjeta, Bizum o efectivo" : "Online"}</td>
              </tr>
              <tr>
                <th scope="row">Envío a domicilio</th>
                <td>
                  {fee}; gratis desde {free}
                </td>
                <td>{ordersEnabled ? `Online, o contra reembolso hasta ${max}` : "Online"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          El coste final aparece antes de pagar. El umbral de envío gratis se calcula después de aplicar descuentos.
          {siteConfig.deliveryTime ? ` Plazo: ${siteConfig.deliveryTime}.` : ""}
        </p>

        <h2>Dónde repartimos</h2>
        <ul>
          {zones.map(([name, cps]) => (
            <li key={name}>
              {name}: {cps.join(" y ")}
            </li>
          ))}
        </ul>
        <p>Si vives fuera de estas zonas, puedes comprar online y recogerlo gratis en la tienda.</p>

        {ordersEnabled && (
          <>
        <h2>Recogida con código QR</h2>
        <p>
          Cuando esté listo, el estado cambia a «Listo para recoger». Enseña el QR o di tu código en el mostrador. Si no habías pagado, lo haces en ese momento.
          {siteConfig.openingHours ? ` Horario: ${siteConfig.openingHours}.` : ""}
        </p>

        <h2>Contra reembolso</h2>
        <p>
          Pagas al repartidor en la puerta.{" "}
          {paymentRules.codSurcharge > 0 ? `Tiene un suplemento de ${formatEuroPrice(paymentRules.codSurcharge)}. ` : "Sin suplemento. "}
          Disponible hasta {max} por pedido.
        </p>

        <h2>Sigue tu pedido</h2>
        <p>
          Cada pedido tiene un código que empieza por HP-. Con él y tu email o teléfono ves el estado, el número de pago y, si va por mensajería, el número de seguimiento.
        </p>
        <Link href="/pedido" className="btn btn-secondary">
          Seguir mi pedido
        </Link>
          </>
        )}

        <h2>Devoluciones</h2>
        <p>
          Tienes 14 días naturales desde que lo recibes para desistir, sin dar motivos.
          {ordersEnabled ? " Pulsa «Desistir de la compra aquí» en la página de tu pedido, confirma y guarda la referencia." : " Basta con comunicarlo en la tienda de forma clara dentro de ese plazo."}
        </p>
        <ol>
          <li>{ordersEnabled ? "Registras el desistimiento en la página de tu pedido." : "Nos comunicas que desistes de la compra."}</li>
          <li>Devuelves los productos en los 14 días siguientes. En tienda no tiene coste; si lo mandas por mensajería, el envío de vuelta corre de tu cuenta.</li>
          <li>Te reembolsamos en un máximo de 14 días, incluido el envío estándar que pagaste. Podemos esperar a recibir los productos.</li>
        </ol>
        <p>El reembolso va al mismo medio con el que pagaste.</p>
        <p>
          No se admiten devoluciones de productos precintados que no son aptos por higiene una vez abiertos, ni las demás excepciones del artículo 103 de la Ley General para la Defensa de los
          Consumidores y Usuarios.
        </p>

        <h2>Si llega roto o equivocado</h2>
        <p>
          La devolución corre de nuestra cuenta. Además, todos los productos nuevos tienen tres años de garantía legal: puedes pedir la reparación o la sustitución y, si no es posible, una rebaja o el
          reembolso.
        </p>
      </div>
    </div>
  );
}
