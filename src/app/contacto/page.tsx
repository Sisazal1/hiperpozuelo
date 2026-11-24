import Link from "next/link";
import { ordersEnabled } from "@/config/commerce";
import { siteConfig } from "@/config/site";
export default function ContactPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Ayuda</span>
        <h1>Contacto</h1>
        {siteConfig.contact ? <p>{siteConfig.contact}</p> : null}
        {siteConfig.address ? <p>{siteConfig.address}</p> : null}
        {ordersEnabled ? (
          <>
            <p>Si es por una compra, el estado, el pago y la devolución están en la página de tu pedido.</p>
            <Link href="/pedido" className="btn btn-secondary">
              Seguir mi pedido
            </Link>{" "}
          </>
        ) : (
          <p>Las dudas sobre envíos, pagos y devoluciones están resueltas en la ayuda.</p>
        )}
        <Link href="/faq" className="btn btn-primary">
          Ver preguntas frecuentes
        </Link>
      </div>
    </div>
  );
}
