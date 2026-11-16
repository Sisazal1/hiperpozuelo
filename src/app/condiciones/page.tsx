import Link from "next/link";
export default function TermsPage() {
  return (
    <div className="commerce-page info-page">
      <div className="commerce-container">
        <span className="eyebrow">Información legal</span>
        <h1>Condiciones</h1>
        <p>Las condiciones comerciales definitivas se publicarán antes de la apertura de la tienda.</p>
        <p>Esta experiencia no cobra ni envía pedidos.</p>
        <Link href="/faq" className="btn btn-primary">
          Resolver dudas
        </Link>
      </div>
    </div>
  );
}
