"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Trash2, TrendingUp } from "lucide-react";
import { useStore } from "@/state/store";
import { getLineInfo } from "@/lib/cart/lines";
import { calculateBundleTotal, getBundleById, getBundleTitle, getUpgradeBundle, tierLabels } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { roundMoney } from "@/config/commerce";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { CategoryVisual, ProductVisual } from "@/components/ui/ProductVisual";
import type { CartLine } from "@/lib/cart/types";

export function CartLineRow({ line, variant }: { line: CartLine; variant: "drawer" | "page" }) {
  const { updateQuantity, removeLine, addBundle } = useStore();
  const [open, setOpen] = useState(false);
  const info = getLineInfo(line);
  const product = line.type === "product" ? getProductById(line.productId) : undefined;
  const bundle = line.type === "bundle" ? getBundleById(line.bundleId) : undefined;
  const upgrade = bundle ? getUpgradeBundle(bundle) : undefined;
  const itemCount = info.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className={`cart-line cart-line--${variant}`}>
      <div className="cart-line__thumb">
        {product ? <ProductVisual product={product} sizes="96px" /> : <CategoryVisual id={info.categoryId ?? "organization"} size={variant === "drawer" ? 26 : 32} />}
      </div>
      <div className="cart-line__main">
        <div className="cart-line__top">
          <div>
            <span className="cart-line__kind">{info.kindLabel}</span>
            <h3>{info.href ? <Link href={info.href}>{info.title}</Link> : info.title}</h3>
          </div>
          <button type="button" className="icon-btn icon-btn--quiet" aria-label={`Eliminar ${info.title} de la cesta`} onClick={() => removeLine(line.lineId)}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>

        {info.items.length > 0 && (
          <>
            <button type="button" className="cart-line__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {itemCount} {itemCount === 1 ? "artículo" : "artículos"} · {open ? "ocultar" : "ver qué incluye"}
              <ChevronDown size={14} aria-hidden="true" className={open ? "is-flipped" : ""} />
            </button>
            {open && (
              <ul className="cart-line__items">
                {info.items.map((item) => (
                  <li key={item.id}><span>{item.name}</span><span>×{item.quantity}</span></li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="cart-line__bottom">
          <QuantityStepper value={line.quantity} label={info.title} onChange={(delta) => updateQuantity(line.lineId, delta)} />
          <div className="cart-line__price">
            {line.quantity > 1 && <small>{formatEuroPrice(info.unit)} c/u</small>}
            <strong>{formatEuroPrice(info.total)}</strong>
          </div>
        </div>

        {info.editHref && info.editLabel && variant === "page" && line.type === "custom_bundle" && (
          <Link className="cart-line__edit" href={info.editHref}>{info.editLabel}</Link>
        )}

        {bundle && upgrade && (
          <div className="upsell">
            <TrendingUp size={16} aria-hidden="true" />
            <p>
              Pasa al tamaño <strong>{tierLabels[upgrade.tier]}</strong>: {upgrade.product_ids.length - bundle.product_ids.length} artículos más por{" "}
              <strong>+{formatEuroPrice(roundMoney(calculateBundleTotal(upgrade) - calculateBundleTotal(bundle)))}</strong>
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              aria-label={`Cambiar ${getBundleTitle(bundle)} por ${getBundleTitle(upgrade)}`}
              onClick={() => { removeLine(line.lineId); addBundle(upgrade.id, upgrade.tier, line.quantity); }}
            >
              Cambiar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
