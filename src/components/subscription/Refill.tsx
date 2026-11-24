"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { pricedItems, subscriptionConfig, subscriptionQuote, isEligible } from "@/config/subscription";
import { useStore } from "@/state/store";
import { readDraft, saveDraft } from "@/lib/subscription-draft";
import { PayRow, ShippingBox, stickyColumn, useAvailability } from "@/components/pdp/parts";
import { useAddedFeedback } from "@/components/motion/hooks";
import { RefillList, WeeksPicker, cents, toItems, toQty } from "./parts";

export default function Refill() {
  const router = useRouter();
  const { addProduct } = useStore();
  const { soldOut, subscriptions } = useAvailability();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [subs, setSubs] = useState(false);
  const [weeks, setWeeks] = useState<number>(subscriptionConfig.defaultWeeks);
  const [added, flash] = useAddedFeedback();
  useEffect(() => {
    const d = readDraft();
    const p = new URLSearchParams(location.search);
    const art = p.get("art") ?? "";
    const start = toQty(d.items);
    if (isEligible(art)) start[art] = Math.max(start[art] ?? 0, Math.min(subscriptionConfig.maxQuantity, Math.max(1, Math.floor(Number(p.get("n"))) || 1)));
    setQty(start);
    setWeeks(d.weeks);
  }, []);
  useEffect(() => {
    if (Object.keys(qty).length) saveDraft({ items: toItems(qty), weeks });
  }, [qty, weeks]);

  const items = toItems(qty).filter((i) => !soldOut.includes(i.id));
  const quote = subscriptionQuote(pricedItems(items), "collect");
  const on = subs && subscriptions;
  const total = on ? quote.goods : quote.subtotal;
  const reason = !items.length ? "Elige al menos un artículo" : on && quote.missing ? `Añade ${cents(quote.missing)} para llegar al mínimo de ${cents(subscriptionConfig.minAfterDiscount * 100)}` : "";
  const go = () => {
    if (on) {
      saveDraft({ items, weeks });
      router.push("/reposicion/suscripcion");
      return;
    }
    for (const i of items) for (let k = 0; k < i.n; k++) addProduct(i.id);
    flash();
  };
  return (
    <div className="pdp refill">
      <div className="pdp-col">
        <div className="pdp-head">
          <div>
            <h1>Reposición</h1>
            <p className="pdp-sub">Lo que se gasta en casa, elegido por ti. Una vez o cada pocas semanas.</p>
          </div>
        </div>
        <RefillList qty={qty} onChange={setQty} subs={on} soldOut={soldOut} />
      </div>
      <div className="pdp-col pdp-panel">
        <div className="pdp-inner" ref={stickyColumn}>
          <fieldset className="refill-mode">
            <legend>Cómo lo quieres</legend>
            <label>
              <input type="radio" name="modo" checked={!on} onChange={() => setSubs(false)} />
              <span>
                <strong>Compra única</strong>
              </span>
              <b>{cents(quote.subtotal)}</b>
            </label>
            {subscriptions && (
              <label>
                <input type="radio" name="modo" checked={on} onChange={() => setSubs(true)} />
                <span>
                  <strong>Suscríbete y ahorra un {subscriptionConfig.discountRate * 100} %</strong>
                </span>
                <b>{cents(quote.goods)}</b>
              </label>
            )}
            {on && (
              <div className="refill-more">
                <ul>
                  <li>
                    <Check size={18} aria-hidden="true" /> Recogida gratis en tienda, o a domicilio si lo prefieres
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Salta, pausa o cambia lo que lleva cuando quieras
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Sin permanencia: cancelas en dos clics
                  </li>
                </ul>
                <WeeksPicker value={weeks} onChange={setWeeks} />
              </div>
            )}
          </fieldset>
          <p className="refill-total" aria-live="polite">
            <span>{on ? "Total por ciclo, IVA incluido" : "Total, IVA incluido"}</span>
            <strong>{cents(total)}</strong>
          </p>
          <button type="button" className={`btn btn-primary btn-lg btn-block add-main ${added ? "is-added" : ""}`} onClick={go} disabled={Boolean(reason)}>
            {reason || (
              <>
                <span className="add-main-label">
                  {on ? null : added ? <Check size={18} /> : <ShoppingBag size={18} />}
                  {on ? "Continuar" : added ? "Añadido a la cesta" : "Añadir a la cesta"}
                  {on && <ArrowRight size={18} />}
                </span>
                <span className="add-main-price">{cents(total)}</span>
              </>
            )}
          </button>
          {!on && <PayRow total={total / 100} />}
          {!on && <ShippingBox />}
        </div>
      </div>
    </div>
  );
}
