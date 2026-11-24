import Link from "next/link";
import { ordersEnabled } from "@/config/commerce";
import { siteConfig } from "@/config/site";
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Hiper Pozuelo</strong>
        <span>Todo lo que necesitas para tu hogar.</span>
        {siteConfig.contact && <a href={`mailto:${siteConfig.contact}`}>{siteConfig.contact}</a>}
      </div>
      <div>
        <strong>Ayuda</strong>
        <Link href="/shop">Explorar productos</Link>
        <Link href="/packs">Packs prediseñados</Link>
        <Link href="/build-pack">Crear un pack</Link>
        {ordersEnabled && <Link href="/pedido">Seguir mi pedido</Link>}
        <Link href="/faq">Preguntas frecuentes</Link>
        <Link href="/contacto">Contacto</Link>
        <Link href="/envios-y-devoluciones">Envíos y devoluciones</Link>
        <Link href="/pago-seguro">Pago seguro</Link>
      </div>
      <div>
        <strong>Información legal</strong>
        <Link href="/aviso-legal">Aviso legal</Link>
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/condiciones">Condiciones</Link>
      </div>
    </footer>
  );
}
