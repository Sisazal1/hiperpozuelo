import Link from "next/link";
export default function NotFound() { return <main className="not-found-page"><span className="eyebrow">Hiper Pozuelo</span><h1>Página no encontrada.</h1><p>La dirección que has solicitado no existe o ya no está disponible.</p><Link className="btn btn-primary" href="/">Volver a inicio</Link></main>; }
