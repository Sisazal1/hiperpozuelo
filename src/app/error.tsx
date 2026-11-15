"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section state-page">
      <span className="eyebrow">Algo ha ido mal</span>
      <h1>No hemos podido cargar esta página.</h1>
      <p>Tu cesta está a salvo. Inténtalo de nuevo o vuelve al inicio.</p>
      <div className="state-page__actions">
        <button type="button" className="btn btn-primary" onClick={reset}>Reintentar</button>
        <Link className="btn btn-secondary" href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
