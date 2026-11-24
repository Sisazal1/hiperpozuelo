"use client";
import { useState } from "react";
import { pricedItems, subscriptionConfig, subscriptionQuote, type SubItem } from "@/config/subscription";
import type { DeliveryMethod } from "@/config/commerce";
import { RefillList, WeeksPicker, cents, subscriptionPost, toItems, toQty } from "./parts";

export default function Manage({ token, status, items, weeks, delivery, canLink }: { token: string; status: string; items: SubItem[]; weeks: number; delivery: DeliveryMethod; canLink: boolean }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [qty, setQty] = useState(toQty(items));
  const [every, setEvery] = useState(weeks);
  const run = async (action: string, body: object = {}) => {
    if (busy) return;
    setBusy(action);
    setError("");
    const r = await subscriptionPost(action, { token, ...body });
    if (r.url) location.assign(r.url);
    else if (r.error) {
      setError(r.error);
      setBusy("");
    } else location.assign(`/suscripcion/${token}?hecho=${action}`);
  };
  const btn = (action: string, label: string) => (
    <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} aria-busy={busy === action} onClick={() => run(action)}>
      {busy === action ? "Un momento…" : label}
    </button>
  );
  const quote = subscriptionQuote(pricedItems(toItems(qty)), delivery);
  if (status === "cancelled") return null;
  return (
    <section className="sub-manage" aria-labelledby="gestion">
      <h2 id="gestion">Gestionar</h2>
      <div className="sub-actions">
        {status === "active" && btn("skip", "Saltar el próximo")}
        {status === "active" && btn("pause", "Pausar")}
        {status === "paused" && btn("resume", "Reanudar")}
        {status === "active" && (
          <button type="button" className="btn btn-secondary" aria-expanded={editing} onClick={() => setEditing(!editing)}>
            Cambiar artículos o frecuencia
          </button>
        )}
        {btn("portal", "Tarjeta y facturas")}
        {canLink && btn("link", "Añadir a mi cuenta")}
      </div>
      {editing && (
        <div className="sub-edit">
          <RefillList qty={qty} onChange={setQty} subs />
          <WeeksPicker value={every} onChange={setEvery} name="nueva-frecuencia" />
          <p className="refill-total" aria-live="polite">
            <span>Desde el próximo ciclo{quote.shipping ? ", envío incluido" : ""}</span>
            <strong>{cents(quote.total)}</strong>
          </p>
          <button type="button" className="btn btn-ink" disabled={Boolean(busy) || quote.missing > 0} onClick={() => run("change", { items: toItems(qty), weeks: every })}>
            {quote.missing ? `Faltan ${cents(quote.missing)} para el mínimo de ${cents(subscriptionConfig.minAfterDiscount * 100)}` : busy === "change" ? "Un momento…" : `Aceptar ${cents(quote.total)} por ciclo`}
          </button>
        </div>
      )}
      <div className="sub-cancel">
        {asking ? (
          <>
            <p>No se hará ningún cobro más. Los pedidos ya pagados siguen su curso.</p>
            <div className="sub-actions">
              {btn("cancel", "Sí, cancelar")}
              <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)}>
                Mantenerla
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="acc-link" onClick={() => setAsking(true)}>
            Cancelar la suscripción
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
