import { getProductById, getProductsByCategory } from "@/lib/catalog/products";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { getCartProductIds, getLineInfo } from "./lines";
import type { CartLine } from "./types";
import type { Product } from "@/types/catalog";

/**
 * Real cross-sell from the catalog's own relationships (cross_sell_ids), topped up
 * with products from the same categories. When the cart is close to free shipping,
 * the items that close the gap come first.
 */
export function getCartRecommendations(cart: CartLine[], gap: number, limit = 4): Product[] {
  if (!cart.length) return [];
  const inCart = new Set(getCartProductIds(cart));
  const pool = new Map<string, Product>();

  for (const id of inCart) {
    for (const product of getComplementaryProducts(id)) {
      if (product && !inCart.has(product.id)) pool.set(product.id, product);
    }
  }

  if (pool.size < limit) {
    const categories = new Set(cart.map((line) => getLineInfo(line).categoryId).filter((id): id is string => Boolean(id)));
    for (const categoryId of categories) {
      for (const product of getProductsByCategory(categoryId)) {
        if (!inCart.has(product.id) && !pool.has(product.id)) pool.set(product.id, product);
      }
    }
  }

  const list = [...pool.values()].filter((p) => getProductById(p.id));
  if (gap > 0) {
    const closers = list.filter((p) => p.proposed_price_eur >= gap).sort((a, b) => a.proposed_price_eur - b.proposed_price_eur);
    const rest = list.filter((p) => p.proposed_price_eur < gap);
    return [...closers, ...rest].slice(0, limit);
  }
  return list.slice(0, limit);
}
