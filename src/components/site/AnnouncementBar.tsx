import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * The one honest, site-wide statement about the current phase. It replaces the
 * scattered "demo" labels that used to sit on every card, button and page.
 */
export default function AnnouncementBar() {
  if (!siteConfig.prelaunch) return null;
  return (
    <div className="announce" role="note">
      <div className="container announce__row">
        <p>
          <strong>Preapertura.</strong> Puedes recorrer toda la compra: todavía no se cobra ni se envía ningún pedido.
        </p>
        <Link href="/faq">Cómo funciona</Link>
      </div>
    </div>
  );
}
