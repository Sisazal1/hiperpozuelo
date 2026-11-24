"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProductById } from "@/lib/catalog/products";
import { cartSubtotal } from "@/lib/cart/totals";
import { toast } from "@/components/motion/Toaster";
import type { Product } from "@/types/catalog";
import { paymentRules } from "@/config/commerce";
import { track } from "@/lib/track";
import { accountPost, hasAccountFlag } from "@/lib/account-client";

const MAX = paymentRules.maxLineQuantity;

export type ProductLine = {
  lineId: string;
  type: "product";
  productId: string;
  quantity: number;
  quantities: Record<string, number>;
  categoryId?: string;
};
export type BundleLine = {
  lineId: string;
  type: "bundle";
  bundleId: string;
  tier: string;
  quantity: number;
  quantities: Record<string, number>;
  categoryId?: string;
};
export type CustomBundleLine = {
  lineId: string;
  type: "custom_bundle";
  productIds: string[];
  quantities: Record<string, number>;
  quantity: number;
  categoryId?: string;
};
export type CartLine = ProductLine | BundleLine | CustomBundleLine;
type Store = {
  favorites: string[];
  cart: CartLine[];
  discountCode: string;
  applyDiscountCode: (code: string) => void;
  removeDiscountCode: () => void;
  toggleFavorite: (id: string) => void;
  addProduct: (id: string) => void;
  addBundle: (bundleId: string, tier: string) => void;
  addCustomBundle: (productIds: string[], quantities: Record<string, number>, categoryId?: string) => void;
  updateCustomBundle: (
    lineId: string,
    productIds: string[],
    quantities: Record<string, number>,
    categoryId?: string,
  ) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  cartDrawerOpen: boolean;
  cartCount: number;
  favoriteProducts: Product[];
  cartTotal: number;
  lastAdded: { lineId: string; at: number } | null;
  hydrated: boolean;
};
const StoreContext = createContext<Store | null>(null);
const normalize = (raw: unknown): CartLine[] =>
  Array.isArray(raw)
    ? raw.flatMap((x: any) =>
        x?.type === "product" && typeof x.productId === "string"
          ? [
              {
                lineId: x.lineId || x.productId,
                type: "product",
                productId: x.productId,
                quantity: Math.min(MAX, Math.max(1, x.quantity || 1)),
                quantities: {},
              },
            ]
          : x?.type === "bundle"
            ? [
                {
                  ...x,
                  lineId: x.lineId || x.bundleId,
                  quantity: Math.min(MAX, Math.max(1, x.quantity || 1)),
                  quantities: x.quantities || {},
                },
              ]
            : x?.type === "custom_bundle" && Array.isArray(x.productIds)
              ? [{ ...x, quantity: Math.min(MAX, Math.max(1, x.quantity || 1)), quantities: x.quantities || {} }]
              : [],
      )
    : [];
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ lineId: string; at: number } | null>(null);
  const markAdded = (lineId: string) => setLastAdded({ lineId, at: Date.now() });
  useEffect(() => {
    try {
      const fav = JSON.parse(localStorage.getItem("hp-favorites") || "[]");
      setFavorites(Array.isArray(fav) ? fav.filter((x) => typeof x === "string") : []);
      setCart(normalize(JSON.parse(localStorage.getItem("hp-shared-cart") || "[]")));
      setDiscountCode(localStorage.getItem("hp-discount-code") || "");
    } catch {
      setFavorites([]);
      setCart([]);
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem("hp-favorites", JSON.stringify(favorites));
  }, [favorites, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("hp-shared-cart", JSON.stringify(cart));
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) {
      if (discountCode) localStorage.setItem("hp-discount-code", discountCode);
      else localStorage.removeItem("hp-discount-code");
    }
  }, [discountCode, hydrated]);
  const value = useMemo<Store>(
    () => ({
      favorites,
      cart,
      discountCode,
      applyDiscountCode: (code) => setDiscountCode(code),
      removeDiscountCode: () => setDiscountCode(""),
      cartDrawerOpen,
      openCartDrawer: () => setCartDrawerOpen(true),
      closeCartDrawer: () => setCartDrawerOpen(false),
      toggleFavorite: (id) => {
        const saved = favorites.includes(id);
        setFavorites((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
        if (hasAccountFlag()) void accountPost("favorite", { id, on: !saved });
        const name = getProductById(id)?.name_es ?? "Producto";
        toast(saved ? `${name} ya no está en favoritos` : `${name} guardado en favoritos`, saved ? "unheart" : "heart");
      },
      addProduct: (id) => {
        if (!cart.length) track("add_to_cart");
        setCart((x) => {
          const line = x.find((i) => i.type === "product" && i.productId === id);
          return line
            ? x.map((i) => (i === line ? { ...i, quantity: Math.min(MAX, i.quantity + 1) } : i))
            : [
                ...x,
                { lineId: `product-${id}`, type: "product", productId: id, quantity: 1, quantities: {} },
              ];
        });
        markAdded(`product-${id}`);
        setCartDrawerOpen(true);
      },
      addBundle: (bundleId, tier) => {
        if (!cart.length) track("add_to_cart");
        setCart((x) => {
          const line = x.find((i) => i.type === "bundle" && i.bundleId === bundleId && i.tier === tier);
          return line
            ? x.map((i) => (i === line ? { ...i, quantity: Math.min(MAX, i.quantity + 1) } : i))
            : [
                ...x,
                {
                  lineId: `bundle-${bundleId}-${tier}`,
                  type: "bundle",
                  bundleId,
                  tier,
                  quantity: 1,
                  quantities: {},
                },
              ];
        });
        markAdded(`bundle-${bundleId}-${tier}`);
        setCartDrawerOpen(true);
      },
      addCustomBundle: (productIds, quantities, categoryId) => {
        if (!cart.length) track("add_to_cart");
        const lineId = `custom-${Date.now()}`;
        markAdded(lineId);
        setCart((x) => [
          ...x,
          {
            lineId,
            type: "custom_bundle",
            productIds,
            quantities,
            categoryId,
            quantity: 1,
          },
        ]);
        setCartDrawerOpen(true);
      },
      updateCustomBundle: (lineId, productIds, quantities, categoryId) =>
        setCart((x) =>
          x.map((i) =>
            i.lineId === lineId && i.type === "custom_bundle"
              ? { ...i, productIds, quantities, categoryId }
              : i,
          ),
        ),
      updateQuantity: (lineId, delta) =>
        setCart((x) =>
          x.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.min(MAX, Math.max(1, i.quantity + delta)) } : i)),
        ),
      removeLine: (lineId) => setCart((x) => x.filter((i) => i.lineId !== lineId)),
      clearCart: () => setCart([]),
      cartCount: cart.reduce((n, i) => n + i.quantity, 0),
      favoriteProducts: favorites.map(getProductById).filter(Boolean) as Product[],
      cartTotal: cartSubtotal(cart),
      lastAdded,
      hydrated,
    }),
    [favorites, cart, cartDrawerOpen, discountCode, lastAdded, hydrated],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
