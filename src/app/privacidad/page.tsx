import type { Metadata } from "next";
import Link from "next/link";
import { ordersEnabled } from "@/config/commerce";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacyPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Privacidad</h1>

        <h2>Responsable</h2>
        <p>
          {siteConfig.legalName}
          {siteConfig.taxId ? `, CIF ${siteConfig.taxId}` : ""}
          {siteConfig.address ? `, ${siteConfig.address}` : ""}
          {siteConfig.contact ? `. Contacto: ${siteConfig.contact}` : ""}.
        </p>

        <h2>Qué datos usamos y para qué</h2>
        <div className="info-table" tabIndex={0} role="region" aria-label="Datos, finalidad y base legal">
          <table>
            <thead>
              <tr>
                <th scope="col">Datos</th>
                <th scope="col">Para qué</th>
                <th scope="col">Base legal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Nombre, email, teléfono y dirección de entrega</th>
                <td>Preparar, entregar y cobrar tu pedido, y que puedas seguirlo</td>
                <td>Contrato de compra</td>
              </tr>
              <tr>
                <th scope="row">Número y estado del pago</th>
                <td>Verificar el cobro, reembolsar y atender reclamaciones</td>
                <td>Contrato y obligación legal</td>
              </tr>
              {ordersEnabled && (
                <>
                  <tr>
                    <th scope="row">Cuenta, si la creas: email, contraseña cifrada, nombre, teléfono, direcciones y favoritos</th>
                    <td>Darte acceso a tus pedidos y datos desde cualquier dispositivo</td>
                    <td>Contrato</td>
                  </tr>
                  <tr>
                    <th scope="row">Email, si marcas que quieres ofertas</th>
                    <td>Enviarte ofertas y novedades</td>
                    <td>Consentimiento, que puedes retirar en tu cuenta</td>
                  </tr>
                </>
              )}
              <tr>
                <th scope="row">Dirección IP del intento de acceso</th>
                <td>Frenar intentos repetidos de adivinar pedidos o contraseñas</td>
                <td>Interés legítimo en la seguridad</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>No guardamos tarjetas. Contamos visitas y pasos de compra como totales por día, sin cookies, sin identificarte y sin terceros.</p>

        <h2>Quién los recibe</h2>
        <p>
          Stripe, para cobrar online; el transportista, si pides envío; y los proveedores que alojan la web y sus datos. Conservamos los pedidos durante los plazos que exige la normativa fiscal y mercantil.
        </p>

        {ordersEnabled && (
          <p>
            En <Link href="/account">tu cuenta</Link> puedes descargar tus datos o eliminarla. Al eliminarla borramos el perfil; los pedidos que la ley obliga a conservar quedan sin vínculo con él.
          </p>
        )}

        <h2>Tus derechos</h2>
        <p>
          Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos, y reclamar ante la Agencia Española de Protección de Datos (aepd.es).{" "}
          <Link href="/contacto">Contacto</Link>.
        </p>
      </div>
    </div>
  );
}
