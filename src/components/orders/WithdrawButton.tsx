"use client";
import { useEffect, useRef, useState } from "react";

// Función de desistimiento en dos pasos (art. 11 bis Directiva 2011/83/UE): botón + confirmación.
export default function WithdrawButton({ token, code }: { token: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  if (!open)
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Desistir de la compra aquí
      </button>
    );
  return (
    <form
      className="withdraw-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await fetch(`/api/orders/${token}/withdraw`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ contact }),
          });
          const d = await r.json();
          if (!r.ok) setError(d.error || "No se ha podido registrar.");
          else location.reload();
        } catch {
          setError("No hay conexión con la tienda.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Vas a desistir del pedido <strong>{code}</strong> completo. Confirma con el email o teléfono de la compra.
      </p>
      <label htmlFor="withdraw-contact">Email o teléfono</label>
      <input ref={input} id="withdraw-contact" value={contact} onChange={(e) => setContact(e.target.value)} required autoComplete="email" aria-invalid={Boolean(error)} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="withdraw-actions">
        <button className="btn btn-primary" disabled={busy}>
          Confirmar desistimiento
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Conservar el pedido
        </button>
      </div>
    </form>
  );
}
