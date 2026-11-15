"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProductById } from "@/lib/catalog/products";
import { getCartSubtotal } from "@/lib/cart/lines";
import type { CartLine } from "@/lib/cart/types";
import type { Product } from "@/types/catalog";

export type { CartLine, ProductLine, BundleLine, CustomBundleLine } from "@/lib/cart/types";

type Store = {
  favorites: string[];
  cart: CartLine[];
  hydrated: boolean;
  cartCount: number;
  cartTotal: number;
  favoriteProducts: Product[];
  cartDrawerOpen: boolean;
  toggleFavorite: (id: string) => void;
  addProduct: (id: string, quantity?: number) => void;
  addBundle: (bundleId: string, tier: string, quantity?: number) => void;
  addCustomBundle: (productIds: string[], quantities: Record<string, number>, categoryId?: string) => void;
  updateCustomBundle: (lineId: string, productIds: string[], quantities: Record<string, number>, categoryId?: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
};

const StoreContext = createContext<Store | null>(null);

const CART_KEY = "hp-shared-cart";
const FAVORITES_KEY = "hp-favorites";

type RawLine = Partial<CartLine> & { type?: string };

/** Reads whatever is in localStorage defensively so an old or corrupt cart never breaks the page. */
function normalize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawLine[]).flatMap((x): CartLine[] => {
    if (!x || typeof x !== "object") return [];
    const quantity = Math.max(1, Number(x.quantity) || 1);
    if (x.type === "product" && "productId" in x && typeof x.productId === "string") {
      return [{ lineId: x.lineId || `product-${x.productId}`, type: "product", productId: x.productId, quantity, quantities: {} }];
    }
    if (x.type === "bundle" && "bundleId" in x && typeof x.bundleId === "string") {
      return [{ lineId: x.lineId || `bundle-${x.bundleId}`, type: "bundle", bundleId: x.bundleId, tier: String((x as { tier?: string }).tier ?? ""), quantity, quantities: {} }];
    }
    if (x.type === "custom_bundle" && "productIds" in x && Array.isArray(x.productIds)) {
      return [{ lineId: x.lineId || `custom-${Date.now()}`, type: "custom_bundle", productIds: x.productIds, quantities: (x as { quantities?: Record<string, number> }).quantities ?? {}, quantity, categoryId: x.categoryId }];
    }
    return [];
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const savedFavorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      setFavorites(Array.isArray(savedFavorites) ? savedFavorites.filter((id): id is string => typeof id === "string") : []);
      setCart(normalize(JSON.parse(localStorage.getItem(CART_KEY) || "[]")));
    } catch {
      setFavorites([]);
      setCart([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* storage unavailable */ }
    }
  }, [favorites, hydrated]);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
    }
  }, [cart, hydrated]);

  const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);

  const value = useMemo<Store>(
    () => ({
      favorites,
      cart,
      hydrated,
      cartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      toggleFavorite: (id) => setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
      addProduct: (id, quantity = 1) => {
        setCart((current) => {
          const line = current.find((item) => item.type === "product" && item.productId === id);
          return line
            ? current.map((item) => (item === line ? { ...item, quantity: item.quantity + quantity } : item))
            : [...current, { lineId: `product-${id}`, type: "product", productId: id, quantity, quantities: {} }];
        });
        setCartDrawerOpen(true);
      },
      addBundle: (bundleId, tier, quantity = 1) => {
        setCart((current) => {
          const line = current.find((item) => item.type === "bundle" && item.bundleId === bundleId && item.tier === tier);
          return line
            ? current.map((item) => (item === line ? { ...item, quantity: item.quantity + quantity } : item))
            : [...current, { lineId: `bundle-${bundleId}-${tier}`, type: "bundle", bundleId, tier, quantity, quantities: {} }];
        });
        setCartDrawerOpen(true);
      },
      addCustomBundle: (productIds, quantities, categoryId) => {
        setCart((current) => [...current, { lineId: `custom-${Date.now()}`, type: "custom_bundle", productIds, quantities, categoryId, quantity: 1 }]);
        setCartDrawerOpen(true);
      },
      updateCustomBundle: (lineId, productIds, quantities, categoryId) =>
        setCart((current) => current.map((item) => (item.lineId === lineId && item.type === "custom_bundle" ? { ...item, productIds, quantities, categoryId } : item))),
      updateQuantity: (lineId, delta) =>
        setCart((current) => current.map((item) => (item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))),
      removeLine: (lineId) => setCart((current) => current.filter((item) => item.lineId !== lineId)),
      clearCart: () => setCart([]),
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      cartTotal: getCartSubtotal(cart),
      favoriteProducts: favorites.map(getProductById).filter((p): p is Product => Boolean(p)),
    }),
    [favorites, cart, hydrated, cartDrawerOpen, openCartDrawer, closeCartDrawer],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
