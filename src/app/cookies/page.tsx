import type { Metadata } from "next";
import { ordersEnabled } from "@/config/commerce";

export const metadata: Metadata = { title: "Cookies y almacenamiento" };

export default function CookiesPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Cookies y almacenamiento</h1>
        <p>La tienda no pone cookies de publicidad ni de seguimiento. En tu navegador solo se guarda lo necesario para que funcione:</p>
        <ul>
          <li>Tu cesta, tus favoritos y los pedidos hechos desde este dispositivo.</li>
          <li>El borrador del formulario de compra, hasta que cierras la pestaña o terminas.</li>
          <li>Que ya has visto este aviso, el de bienvenida y la intro.</li>
          {ordersEnabled && <li>Si entras en tu cuenta, una cookie de sesión (hp_customer) necesaria para mantenerla abierta. Dura 30 días o hasta que cierres sesión.</li>}
        </ul>
        <p>Contamos visitas y pasos de compra como totales por día, sin cookies y sin identificarte. Si pagas online, la página de pago es de Stripe y usa sus propias cookies para cobrar y evitar fraudes.</p>
      </div>
    </div>
  );
}
