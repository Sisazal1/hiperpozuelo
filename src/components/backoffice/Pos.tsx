"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { searchProducts } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { posAction } from "@/app/backoffice/actions";
import type { Product } from "@/types/catalog";

const TENDERS = [
  ["card", "Tarjeta"],
  ["bizum", "Bizum"],
  ["cash", "Efectivo"],
] as const;

export default function Pos({ stock: initial }: { stock: Record<string, number> }) {
  const [stock, setStock] = useState(initial);
  const [q, setQ] = useState("");
  const [ticket, setTicket] = useState<{ p: Product; n: number }[]>([]);
  const [tender, setTender] = useState<string>("card");
  const [reference, setReference] = useState("");
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; code: string; change: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef("");
  const results = useMemo(() => searchProducts(q).slice(0, 24), [q]);
  const total = Math.round(ticket.reduce((s, l) => s + l.p.proposed_price_eur * l.n, 0) * 100) / 100;
  const given = Number(cash.replace(",", "."));
  const change = tender === "cash" && cash ? Math.round((given - total) * 100) / 100 : null;

  const add = (p: Product) => {
    setDone(null);
    setTicket((t) => (t.some((l) => l.p.id === p.id) ? t.map((l) => (l.p.id === p.id ? { ...l, n: Math.min(99, l.n + 1) } : l)) : [...t, { p, n: 1 }]));
  };
  const change_n = (id: string, d: number) => setTicket((t) => t.map((l) => (l.p.id === id ? { ...l, n: Math.max(1, Math.min(99, l.n + d)) } : l)));

  const pay = async () => {
    setError("");
    setBusy(true);
    try {
      key.current ||= crypto.randomUUID();
      const r = await posAction({ lines: ticket.map((l) => ({ productId: l.p.id, quantity: l.n })), tender, reference, requestKey: key.current });
      if (r.error || !r.id) return setError(r.error || "No se ha podido cobrar.");
      setDone({ id: r.id, code: r.code!, change });
      setStock((s) => ({ ...s, ...Object.fromEntries(ticket.filter((l) => l.p.id in s).map((l) => [l.p.id, s[l.p.id] - l.n])) }));
      setTicket([]);
      setReference("");
      setCash("");
      key.current = "";
    } catch {
      // La clave se conserva: repetir el cobro no duplica la venta.
      setError("No hay conexión. Pulsa otra vez: la venta no se duplica.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pos">
      <section className="pos-catalog" aria-label="Productos">
        <label className="pos-search">
          Buscar producto
          <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus autoComplete="off" />
        </label>
        <ul className="pos-grid">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => add(p)}>
                <span>{p.name_es}</span>
                <strong>{formatEuroPrice(p.proposed_price_eur)}</strong>
                <small>{p.id in stock ? `${stock[p.id]} uds` : "Sin inventariar"}</small>
              </button>
            </li>
          ))}
        </ul>
        {!results.length && <p className="bo-empty">Ningún producto coincide.</p>}
      </section>
      <section className="pos-ticket" aria-label="Ticket">
        <h2>Ticket</h2>
        {done && (
          <div className="bo-msg is-ok" role="status">
            Venta <Link href={`/backoffice/pedidos/${done.id}`}>{done.code}</Link> cobrada.
            {done.change !== null && done.change > 0 ? ` Cambio: ${formatEuroPrice(done.change)}.` : ""}
          </div>
        )}
        {ticket.length ? (
          <ul className="pos-lines">
            {ticket.map((l) => (
              <li key={l.p.id}>
                <span>{l.p.name_es}</span>
                <span className="pos-qty">
                  <button type="button" onClick={() => change_n(l.p.id, -1)} aria-label={`Menos ${l.p.name_es}`} disabled={l.n <= 1}>
                    <Minus size={15} />
                  </button>
                  <b>{l.n}</b>
                  <button type="button" onClick={() => change_n(l.p.id, 1)} aria-label={`Más ${l.p.name_es}`}>
                    <Plus size={15} />
                  </button>
                </span>
                <strong>{formatEuroPrice(l.p.proposed_price_eur * l.n)}</strong>
                <button type="button" className="pos-x" onClick={() => setTicket((t) => t.filter((x) => x.p.id !== l.p.id))} aria-label={`Quitar ${l.p.name_es}`}>
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !done && <p className="bo-empty">Toca un producto para añadirlo.</p>
        )}
        <div className="pos-pay">
          <p className="pos-total">
            Total <strong>{formatEuroPrice(total)}</strong>
          </p>
          <div className="bo-seg" role="radiogroup" aria-label="Medio de cobro">
            {TENDERS.map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={tender === k} onClick={() => {
                  setTender(k);
                  setError("");
                }}>
                {label}
              </button>
            ))}
          </div>
          {tender === "cash" ? (
            <label>
              Entregado (€)
              <input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" />
              {change !== null && Number.isFinite(change) && <small>{change >= 0 ? `Cambio: ${formatEuroPrice(change)}` : `Faltan ${formatEuroPrice(-change)}`}</small>}
            </label>
          ) : (
            <label>
              Nº de operación {tender === "card" ? "del datáfono" : "del Bizum"}
              <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} autoComplete="off" />
            </label>
          )}
          {error && (
            <p className="bo-msg is-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="bo-btn is-primary pos-go" onClick={pay} disabled={busy || !ticket.length || (change !== null && change < 0)}>
            {busy ? "Cobrando…" : `Cobrar ${formatEuroPrice(total)}`}
          </button>
        </div>
      </section>
    </div>
  );
}
