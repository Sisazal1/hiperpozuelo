import { getProductById } from "@/lib/catalog/products";
import { calculateBundleTotal, getBundleById, getBundleTitle } from "@/lib/catalog/bundles";
import { roundMoney } from "@/config/commerce";
import type { CartLine } from "./types";

export type LineItem = { id: string; name: string; quantity: number };

export type LineInfo = {
  title: string;
  kindLabel: string;
  unit: number;
  total: number;
  items: LineItem[];
  href: string | null;
  editHref: string | null;
  editLabel: string | null;
  productId?: string;
  categoryId?: string;
};

/** One place that knows how to name and price every kind of cart line. */
export function getLineInfo(line: CartLine): LineInfo {
  if (line.type === "product") {
    const product = getProductById(line.productId);
    const unit = product?.proposed_price_eur ?? 0;
    return {
      title: product?.name_es ?? "Producto no disponible",
      kindLabel: product?.subcategory ?? "Producto",
      unit,
      total: roundMoney(unit * line.quantity),
      items: [],
      href: product ? `/product/${product.slug}` : null,
      editHref: null,
      editLabel: null,
      productId: line.productId,
      categoryId: product?.category_id,
    };
  }
  if (line.type === "bundle") {
    const bundle = getBundleById(line.bundleId);
    const unit = bundle ? calculateBundleTotal(bundle) : 0;
    return {
      title: bundle ? getBundleTitle(bundle) : "Pack no disponible",
      kindLabel: "Pack",
      unit,
      total: roundMoney(unit * line.quantity),
      items: (bundle?.product_ids ?? []).map((id) => ({ id, name: getProductById(id)?.name_es ?? "Producto no disponible", quantity: 1 })),
      href: bundle ? `/packs/${bundle.category_id}/${bundle.tier}` : null,
      editHref: bundle ? `/packs/${bundle.category_id}/${bundle.tier}` : null,
      editLabel: "Cambiar tamaño",
      categoryId: bundle?.category_id,
    };
  }
  const items = line.productIds.map((id) => ({
    id,
    name: getProductById(id)?.name_es ?? "Producto no disponible",
    quantity: line.quantities[id] ?? 0,
  }));
  const unit = roundMoney(items.reduce((sum, item) => sum + (getProductById(item.id)?.proposed_price_eur ?? 0) * item.quantity, 0));
  return {
    title: "Pack personalizado",
    kindLabel: "Tu selección",
    unit,
    total: roundMoney(unit * line.quantity),
    items,
    href: null,
    editHref: `/build-pack?edit=${encodeURIComponent(line.lineId)}`,
    editLabel: "Editar pack",
    categoryId: line.categoryId,
  };
}

export const getCartSubtotal = (cart: CartLine[]) => roundMoney(cart.reduce((sum, line) => sum + getLineInfo(line).total, 0));

/** Ids of every catalog product present in the cart (used to avoid recommending what is already there). */
export const getCartProductIds = (cart: CartLine[]) =>
  cart.flatMap((line) => (line.type === "product" ? [line.productId] : getLineInfo(line).items.map((item) => item.id)));
