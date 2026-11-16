import Link from "next/link";
export default function CookiesPage() {
  return (
    <main className="commerce-page info-page" id="main-content">
      <div className="commerce-container">
        <span className="eyebrow">Privacidad</span>
        <h1>Cookies y almacenamiento</h1>
        <p>
          Esta tienda utiliza únicamente almacenamiento técnico del navegador para conservar la cesta y los
          favoritos.
        </p>
        <p>No utilizamos cookies de analítica, publicidad ni seguimiento.</p>
        <Link href="/" className="btn btn-primary">
          Volver a inicio
        </Link>
      </div>
    </main>
  );
}
