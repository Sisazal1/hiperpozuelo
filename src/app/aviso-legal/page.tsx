import Link from "next/link";
import { siteConfig } from "@/config/site";
export default function LegalPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Aviso legal</h1>
        <p>
          Titular de esta web: {siteConfig.legalName}
          {siteConfig.taxId ? `, CIF ${siteConfig.taxId}` : ""}
          {siteConfig.address ? `, ${siteConfig.address}` : ""}
          {siteConfig.contact ? `. Contacto: ${siteConfig.contact}` : ""}.
        </p>
        <p>
          Los textos, la marca y el diseño pertenecen a su titular. Puedes enlazar la web y usarla para comprar; no está permitido copiarla con fines comerciales. Se aplica la ley española.
        </p>
        <Link href="/" className="btn btn-primary">
          Volver a inicio
        </Link>
      </div>
    </div>
  );
}
