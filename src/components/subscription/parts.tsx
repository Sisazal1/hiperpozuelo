"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { discountedUnit, subscriptionConfig, weeksLabel, type SubItem } from "@/config/subscription";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import ProductVisual from "@/components/catalog/ProductVisual";
import { Stepper } from "@/components/pdp/parts";

export const cents = (c: number) => formatEuroPrice(c / 100);

/** Los consumibles elegibles, con cantidades. */
export function RefillList({ qty, onChange, subs, soldOut = [] }: { qty: Record<string, number>; onChange: (q: Record<string, number>) => void; subs: boolean; soldOut?: string[] }) {
  return (
    <ul className="pdp-contents refill-list">
      {subscriptionConfig.eligible.map((id) => {
        const p = getProductById(id)!;
        const n = qty[id] ?? 0;
        const unit = Math.round(p.proposed_price_eur * 100);
        return (
          <li key={id} data-off={n === 0 || undefined}>
            <ProductVisual categoryId={p.category_id} subcategory={p.subcategory} image={p.image} size="sm" />
            <span>
              <Link href={`/product/${p.slug}`}>{p.name_es}</Link>
              <small>{subs ? `${cents(discountedUnit(unit))} con suscripción` : cents(unit)}</small>
            </span>
            {soldOut.includes(id) ? (
              <em>Agotado</em>
            ) : n === 0 ? (
              <button type="button" className="pdp-plus" aria-label={`Añadir ${p.name_es}`} onClick={() => onChange({ ...qty, [id]: 1 })}>
                <Plus size={18} />
              </button>
            ) : (
              <Stepper value={n} min={0} label={p.name_es} onChange={(v) => onChange({ ...qty, [id]: Math.min(v, subscriptionConfig.maxQuantity) })} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const toItems = (qty: Record<string, number>): SubItem[] => subscriptionConfig.eligible.map((id) => ({ id, n: qty[id] ?? 0 })).filter((i) => i.n > 0);
export const toQty = (items: SubItem[]) => Object.fromEntries(items.map((i) => [i.id, i.n]));

export function WeeksPicker({ value, onChange, name = "weeks", legend = "Frecuencia" }: { legend?: string; value: number; onChange: (w: number) => void; name?: string }) {
  return (
    <fieldset className="refill-weeks">
      <legend>{legend}</legend>
      <div>
        {subscriptionConfig.weeks.map((w) => (
          <label key={w}>
            <input type="radio" name={name} value={w} checked={value === w} onChange={() => onChange(w)} />
            <span>{weeksLabel(w)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export async function subscriptionPost(action: string, body: object): Promise<{ ok?: true; url?: string; error?: string; fields?: Record<string, string> }> {
  try {
    const r = await fetch(`/api/subscription/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await r.json();
  } catch {
    return { error: "No hay conexión. Vuelve a intentarlo." };
  }
}
