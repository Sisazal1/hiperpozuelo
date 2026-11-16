import Link from "next/link";
import { siteConfig } from "@/config/site";
export default function ContactPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Ayuda</span>
        <h1>Contacto</h1>
        {siteConfig.contact ? <p>{siteConfig.contact}</p> : null}
        <p>Para consultas, los datos de contacto se publicarán cuando estén confirmados.</p>
        <Link href="/faq" className="btn btn-primary">
          Ver preguntas frecuentes
        </Link>
      </div>
    </div>
  );
}
