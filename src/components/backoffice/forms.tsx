"use client";
import { useState, type ReactNode } from "react";
import type { ActionState } from "@/app/backoffice/actions";

type Action = (prev: ActionState, f: FormData) => Promise<ActionState>;

/**
 * Formulario de backoffice: aviso de error/éxito y botón bloqueado mientras guarda.
 * Recarga completa al guardar, a propósito: con revalidatePath o router.refresh (Next 15.5) la
 * transición a veces no llegaba a pintarse y se veía un estado antiguo. Aquí eso es un error de caja.
 */
export function ActionForm({
  action,
  hidden,
  children,
  submit,
  tone = "primary",
  className = "",
  confirm,
  hideOk,
}: {
  action: Action;
  hidden?: Record<string, string>;
  children?: ReactNode;
  submit: ReactNode;
  tone?: "primary" | "plain" | "danger";
  className?: string;
  confirm?: string;
  hideOk?: boolean;
}) {
  const [state, setState] = useState<ActionState>({});
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`bo-form ${className}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || (confirm && !window.confirm(confirm))) return;
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setState({});
        try {
          const r = (await action({}, data)) ?? {};
          if (r.ok) {
            if (!hideOk) sessionStorage.setItem("bo-flash", r.ok);
            location.reload();
            return;
          }
          setState(r);
          setBusy(false);
        } catch {
          setState({ error: "No hay conexión. Comprueba si se ha guardado antes de repetir." });
          setBusy(false);
        }
      }}
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <button className={`bo-btn is-${tone}`} disabled={busy}>
        {busy ? "Guardando…" : submit}
      </button>
      {state.error && (
        <p className="bo-msg is-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function TenderFields({ cod = false, refund = false }: { cod?: boolean; refund?: boolean }) {
  return (
    <>
      <label>
        {refund ? "Cómo se devuelve" : "Cómo ha pagado"}
        <select name="tender" required defaultValue="">
          <option value="" disabled>
            Elegir
          </option>
          <option value="card">Tarjeta (datáfono)</option>
          <option value="bizum">Bizum</option>
          <option value="cash">Efectivo</option>
          {cod && !refund && <option value="courier">Liquidación del courier</option>}
        </select>
      </label>
      <label>
        Nº de operación
        <input name="reference" autoComplete="off" placeholder="Obligatorio salvo efectivo" maxLength={60} />
      </label>
    </>
  );
}
