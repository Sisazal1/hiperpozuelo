"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Heart, RefreshCw, ShoppingBag } from "lucide-react";
import { useStore } from "@/state/store";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { getCategoryById } from "@/lib/catalog/categories";
import { singular, unitsOf } from "@/lib/catalog/unit";
import type { Product } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import Gallery from "@/components/pdp/Gallery";
import { Accordion, BuyBar, CompleteProducts, FactsBand, FamilyTiles, PayRow, PdpFaq, ReturnsAccordion, ShippingBox, Stepper, stickyColumn, useAvailability } from "@/components/pdp/parts";
import PointsNote from "@/components/points/PointsNote";
import Reviews, { RatingLink } from "@/components/reviews/Reviews";
import type { ReviewData } from "@/config/reviews";
import { isEligible, subscriptionConfig } from "@/config/subscription";
import { useBuyBar } from "@/components/pdp/useBuyBar";
import { track } from "@/lib/track";
import { useAddedFeedback, useTweenedNumber } from "@/components/motion/hooks";

export default function ProductExperience({ product, reviews }: { product: Product; reviews: ReviewData }) {
  useEffect(() => track("product_view"), [product.id]);
  const { favorites, toggleFavorite, addProduct } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [added, flash] = useAddedFeedback();
  const panel = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const showBar = useBuyBar(panel, cta);
  const { soldOut, subscriptions } = useAvailability();
  const out = soldOut.includes(product.id);
  const total = product.proposed_price_eur * quantity;
  const price = useTweenedNumber(total);
  const category = getCategoryById(product.category_id);
  const units = unitsOf(product);
  const related = useMemo(
    () => getComplementaryProducts(product.id).filter((item): item is NonNullable<typeof item> => Boolean(item)) as Product[],
    [product.id],
  );
  const saved = favorites.includes(product.id);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hp-recent-products") || "[]");
      const list = Array.isArray(raw) ? raw : [];
      localStorage.setItem("hp-recent-products", JSON.stringify([product.id, ...list.filter((id: string) => id !== product.id)].slice(0, 4)));
    } catch {}
  }, [product.id]);
  const add = () => {
    for (let i = 0; i < quantity; i += 1) addProduct(product.id);
    flash();
  };
  const visual = (size: "sm" | "lg") => (
    <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} size={size} priority={size === "lg"} />
  );
  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <ol>
          <li>
            <Link href="/shop">Tienda</Link>
          </li>
          {category && (
            <li>
              <Link href={`/category/${category.id}`}>{category.name_es}</Link>
            </li>
          )}
          <li aria-current="page">{product.name_es}</li>
        </ol>
      </nav>
      <div className="pdp">
        <div className="pdp-col" ref={stickyColumn}>
          <Gallery images={product.image ? [product.image] : []} alt={product.name_es} tile={visual("lg")} />
        </div>
        <div className="pdp-col pdp-panel" ref={panel}>
          <div className="pdp-inner" ref={stickyColumn}>
            <RatingLink data={reviews} />
            <div className="pdp-head">
              <div>
                <h1>{product.name_es}</h1>
                <p className="pdp-sub">{product.subcategory}</p>
              </div>
              <button
                className={`favorite-detail ${saved ? "is-saved" : ""}`}
                onClick={() => toggleFavorite(product.id)}
                aria-pressed={saved}
                aria-label={saved ? "Quitar de favoritos" : "Añadir a favoritos"}
              >
                <Heart size={20} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
            <ul className="pdp-chips">
              <li className="is-price">{formatEuroPrice(product.proposed_price_eur)}</li>
              {units && (
                <>
                  <li>
                    {units.count} {units.word}
                  </li>
                  <li>
                    {formatEuroPrice(product.proposed_price_eur / units.count)} por {singular(units.word)}
                  </li>
                </>
              )}
            </ul>
            <p className="pdp-desc">
              {product.description_es} <a href="#detalles">Ver detalles</a>
            </p>
            <div className="pdp-qty">
              <span>Cantidad</span>
              <Stepper value={quantity} onChange={setQuantity} label={product.name_es} disabled={out} />
            </div>
            <button ref={cta} type="button" className={`btn btn-primary btn-lg btn-block add-main ${added ? "is-added" : ""}`} onClick={add} disabled={out}>
              {out ? (
                "Agotado"
              ) : (
                <>
                  <span className="add-main-label">
                    {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                    {added ? "Añadido a la cesta" : "Añadir a la cesta"}
                  </span>
                  <span className="add-main-price">{formatEuroPrice(price)}</span>
                </>
              )}
            </button>
            {subscriptions && isEligible(product.id) && (
              <Link className="pdp-subs" href={`/reposicion?art=${product.id}&n=${quantity}`}>
                <RefreshCw size={20} aria-hidden="true" />
                <span>
                  <strong>Suscríbete y ahorra un {subscriptionConfig.discountRate * 100} %</strong>
                  Recíbelo cada {subscriptionConfig.weeksText} semanas.
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
            <PayRow total={total} />
            <ShippingBox />
            <PointsNote goodsCents={Math.round(total * 100)} />
            <div className="pdp-acc">
              <Accordion title="Qué incluye" id="detalles" open>
                <p>
                  {product.name_es}. {product.description_es}
                </p>
                <p>Referencia {product.id}</p>
              </Accordion>
              <ReturnsAccordion />
            </div>
          </div>
        </div>
      </div>
      <CompleteProducts products={related} soldOut={soldOut} />
      <Reviews type="product" id={product.id} data={reviews} />
      <FamilyTiles />
      <FactsBand />
      <PdpFaq />
      <BuyBar show={showBar} visual={visual("sm")} name={product.name_es} price={total}>
        <button className={`btn btn-primary ${added ? "is-added" : ""}`} onClick={add} disabled={out}>
          {added ? <Check size={17} /> : <ShoppingBag size={17} />} {out ? "Agotado" : added ? "Añadido" : "Añadir"}
        </button>
      </BuyBar>
    </>
  );
}
