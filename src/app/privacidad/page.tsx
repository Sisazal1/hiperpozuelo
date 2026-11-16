import Link from "next/link";
export default function PrivacyPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Privacidad</h1>
        <p>
          Hiper Pozuelo solo utiliza los datos necesarios para mantener las funciones de esta experiencia. La
          cesta y los favoritos se guardan localmente en tu navegador.
        </p>
        <p>No se utiliza analítica en esta versión.</p>
        <Link href="/cookies" className="btn btn-primary">
          Ver cookies
        </Link>
      </div>
    </div>
  );
}
