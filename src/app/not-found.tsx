import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section state-page">
      <span className="eyebrow">Error 404</span>
      <h1>No encontramos esta página.</h1>
      <p>La dirección no existe o el producto ya no está disponible. Estos enlaces te llevan de vuelta a la compra:</p>
      <div className="state-page__actions">
        <Link className="btn btn-primary" href="/shop">Explorar la tienda</Link>
        <Link className="btn btn-secondary" href="/packs">Ver packs</Link>
        <Link className="btn btn-ghost" href="/">Ir al inicio</Link>
      </div>
    </div>
  );
}
