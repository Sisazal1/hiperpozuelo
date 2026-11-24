"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, contact }),
      });
      const d = await r.json();
      if (r.ok) router.push(`/pedido/${d.token}`);
      else
        setError(
          r.status === 429
            ? "Demasiados intentos. Vuelve a probar en 15 minutos."
            : r.status === 404
              ? "No encontramos ese pedido con esos datos. Revisa el código y el email o teléfono."
              : "El seguimiento no está disponible ahora mismo.",
        );
    } catch {
      setError("No hay conexión con la tienda.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="commerce-page order-lookup">
      <div className="commerce-container">
        <span className="eyebrow">Seguimiento</span>
        <h1>¿Dónde está mi pedido?</h1>
        <p>Escribe el código que te dimos al comprar (empieza por HP-) y el email o teléfono que usaste.</p>
        <form className="lookup-form" onSubmit={submit}>
          <div className="co-field">
            <label htmlFor="lk-code">Código de pedido</label>
            <input id="lk-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HP-" required autoComplete="off" spellCheck={false} />
          </div>
          <div className="co-field">
            <label htmlFor="lk-contact">Email o teléfono</label>
            <input id="lk-contact" value={contact} onChange={(e) => setContact(e.target.value)} required autoComplete="email" />
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Buscando…" : "Ver mi pedido"}
          </button>
        </form>
      </div>
    </div>
  );
}
