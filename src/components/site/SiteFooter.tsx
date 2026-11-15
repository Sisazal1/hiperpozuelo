import Image from "next/image";
import Link from "next/link";
import { Lock, RotateCcw, ShoppingBag, Store, Truck } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { formatEuroPrice } from "@/lib/catalog/pricing";

const columns = [
  { title: "Tienda", links: [["Todos los productos", "/shop"], ["Packs", "/packs"], ["Crea tu pack", "/build-pack"], ["Favoritos", "/favorites"]] },
  { title: "Ayuda", links: [["Preguntas frecuentes", "/faq"], ["Envíos y devoluciones", "/envios-y-devoluciones"], ["Contacto", "/contacto"], ["Mis pedidos", "/account/orders"]] },
  { title: "Legal", links: [["Aviso legal", "/aviso-legal"], ["Política de privacidad", "/privacidad"], ["Política de cookies", "/cookies"], ["Condiciones de compra", "/condiciones"]] },
];

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__promises">
        <div className="container">
          <ul>
            <li><Truck size={22} aria-hidden="true" /><span><strong>Envío gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}</strong><small>{formatEuroPrice(commerceConfig.standardShippingFee)} en pedidos menores</small></span></li>
            <li><Store size={22} aria-hidden="true" /><span><strong>Recogida en tienda gratis</strong><small>Click &amp; Collect</small></span></li>
            <li><ShoppingBag size={22} aria-hidden="true" /><span><strong>Compra sin registrarte</strong><small>Pedido como invitado</small></span></li>
            <li><RotateCcw size={22} aria-hidden="true" /><span><strong>14 días para desistir</strong><small>Según la ley de consumo</small></span></li>
          </ul>
        </div>
      </div>
      <div className="container footer__main">
        <div className="footer__brand">
          <Image src="/brand/hiper-pozuelo-logo-transparent.png" alt="Hiper Pozuelo" width={170} height={37} />
          <p>{siteConfig.tagline}. Packs y productos para empezar en casa sin complicaciones.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>{column.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="footer__legal">
        <div className="container">
          <p><Lock size={14} aria-hidden="true" /> © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.</p>
          {siteConfig.prelaunch && <p>Tienda en preapertura: precios y catálogo provisionales.</p>}
        </div>
      </div>
    </footer>
  );
}
