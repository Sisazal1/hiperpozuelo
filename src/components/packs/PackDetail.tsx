"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Plus, RotateCcw, ShoppingBag } from "lucide-react";
import { getAllBundles, TIER_LABEL } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { families } from "@/lib/catalog/families";
import { lineUnitPrice } from "@/lib/cart/totals";
import { useStore } from "@/state/store";
import type { Bundle, BundleTier, Product } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import Gallery from "@/components/pdp/Gallery";
import { Accordion, BuyBar, CompletePacks, FactsBand, FamilyTiles, PayRow, PdpFaq, ReturnsAccordion, ShippingBox, Stepper, stickyColumn, useSoldOut } from "@/components/pdp/parts";
import { useBuyBar } from "@/components/pdp/useBuyBar";
import { useAddedFeedback, useTweenedNumber } from "@/components/motion/hooks";

const tiers: BundleTier[] = ["small", "medium", "large"];

export default function PackDetail({ familyId, bundle }: { familyId: string; bundle: Bundle }) {
  const { addBundle, addCustomBundle } = useStore();
  const family = families.find((f) => f.id === familyId)!;
  const siblings = getAllBundles().filter((b) => b.category_id === familyId);
  const products = useMemo(() => bundle.product_ids.map(getProductById).filter(Boolean) as Product[], [bundle]);
  const soldOut = useSoldOut();
  const [edits, setEdits] = useState<Record<string, number>>({});
  const qty = (id: string) => (soldOut.includes(id) ? 0 : (edits[id] ?? 1));
  const chosen = products.filter((p) => qty(p.id) > 0);
  const untouched = products.every((p) => qty(p.id) === 1);
  const quantities = Object.fromEntries(chosen.map((p) => [p.id, qty(p.id)]));
  const total = untouched
    ? (lineUnitPrice({ type: "bundle", bundleId: bundle.id }) ?? 0)
    : (lineUnitPrice({ type: "custom_bundle", productIds: chosen.map((p) => p.id), quantities }) ?? 0);
  const price = useTweenedNumber(total);
  const count = chosen.reduce((n, p) => n + qty(p.id), 0);
  const [added, flash] = useAddedFeedback(1800);
  const panel = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const showBar = useBuyBar(panel, cta);

  const add = () => {
    if (untouched) addBundle(bundle.id, bundle.tier);
    else addCustomBundle(chosen.map((p) => p.id), quantities, familyId);
    flash();
  };
  const reason = count === 0 ? "Elige al menos un artículo" : "";

  return (
    <div className="product-page">
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <ol>
          <li>
            <Link href="/packs">Packs</Link>
          </li>
          <li aria-current="page">{bundle.name_es}</li>
        </ol>
      </nav>
      <div className="pdp">
        <div className="pdp-col" ref={stickyColumn}>
          <Gallery images={[...family.images]} alt={`Ambiente de ${family.label.toLowerCase()}`} tile={null} />
        </div>
        <div className="pdp-col pdp-panel" ref={panel}>
          <div className="pdp-inner" ref={stickyColumn}>
            <div className="pdp-head">
              <div>
                <h1>{bundle.name_es}</h1>
                <p className="pdp-sub">{family.tagline}</p>
              </div>
            </div>
            <ul className="pdp-chips">
              <li className="is-price pack-summary-price" aria-live="polite">
                {formatEuroPrice(total)}
              </li>
              <li>
                {count} {count === 1 ? "artículo" : "artículos"}
              </li>
            </ul>
            <p className="pdp-desc">
              {bundle.description_es} El precio es la suma de lo que incluye. <a href="#detalles">Ver detalles</a>
            </p>
            <div className="pack-segmented" role="radiogroup" aria-label="Tamaño del pack" style={{ ["--tier-index" as string]: tiers.indexOf(bundle.tier) }}>
              <span className="pack-segmented-pill" aria-hidden="true" />
              {tiers.map((t) => {
                const b = siblings.find((x) => x.tier === t);
                return (
                  <Link key={t} href={`/packs/${familyId}/${t}`} scroll={false} replace role="radio" aria-checked={bundle.tier === t} className={bundle.tier === t ? "selected" : ""}>
                    {TIER_LABEL[t]}
                    <small>{b?.product_ids.length ?? 0} artículos</small>
                  </Link>
                );
              })}
            </div>
            <div className="pdp-contents-head">
              <h2>Elige qué lleva</h2>
              {Object.keys(edits).length > 0 && (
                <button type="button" onClick={() => setEdits({})}>
                  <RotateCcw size={16} aria-hidden="true" /> Pack original
                </button>
              )}
            </div>
            <ul className="pdp-contents">
              {products.map((p) => {
                const out = soldOut.includes(p.id);
                const n = qty(p.id);
                return (
                  <li key={p.id} data-off={n === 0 || undefined}>
                    <ProductVisual categoryId={p.category_id} subcategory={p.subcategory} image={p.image} size="sm" />
                    <span>
                      <Link href={`/product/${p.slug}`}>{p.name_es}</Link>
                      <small>{formatEuroPrice(p.proposed_price_eur)}</small>
                    </span>
                    {out ? (
                      <em>Agotado</em>
                    ) : n === 0 ? (
                      <button type="button" className="pdp-plus" aria-label={`Añadir ${p.name_es}`} onClick={() => setEdits({ ...edits, [p.id]: 1 })}>
                        <Plus size={18} />
                      </button>
                    ) : (
                      <Stepper value={n} min={0} label={p.name_es} onChange={(v) => setEdits({ ...edits, [p.id]: v })} />
                    )}
                  </li>
                );
              })}
            </ul>
            <button ref={cta} type="button" className={`btn btn-primary btn-lg btn-block add-main ${added ? "is-added" : ""}`} onClick={add} disabled={!!reason}>
              {reason || (
                <>
                  <span className="add-main-label">
                    {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                    {added ? "Añadido" : untouched ? "Añadir pack" : "Añadir mi pack"}
                  </span>
                  <span className="add-main-price">{formatEuroPrice(price)}</span>
                </>
              )}
            </button>
            <PayRow total={total} />
            <ShippingBox />
            <div className="pdp-acc">
              <Accordion title="Qué incluye" id="detalles" open>
                {chosen.length ? (
                  <ul>
                    {chosen.map((p) => (
                      <li key={p.id}>
                        {qty(p.id)} × {p.name_es}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Todavía no has elegido ningún artículo.</p>
                )}
              </Accordion>
              <ReturnsAccordion />
            </div>
          </div>
        </div>
      </div>
      <CompletePacks familyId={familyId} soldOut={soldOut} />
      <FamilyTiles />
      <FactsBand />
      <PdpFaq />
      <BuyBar show={showBar} visual={<Image className="pdp-bar-img" src={family.image} alt="" width={48} height={48} />} name={bundle.name_es} price={total}>
        <button className={`btn btn-primary ${added ? "is-added" : ""}`} onClick={add} disabled={!!reason}>
          {added ? <Check size={17} /> : <ShoppingBag size={17} />} {added ? "Añadido" : "Añadir"}
        </button>
      </BuyBar>
    </div>
  );
}
