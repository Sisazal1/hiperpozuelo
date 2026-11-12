"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProductById } from "@/lib/catalog/products";
import { calculateBundleTotal } from "@/lib/catalog/bundles";
import type { Product } from "@/types/catalog";

export type ProductLine = { lineId:string; type:"product"; productId:string; quantity:number; quantities:Record<string,number>; categoryId?:string };
export type BundleLine = { lineId:string; type:"bundle"; bundleId:string; tier:string; quantity:number; quantities:Record<string,number>; categoryId?:string };
export type CustomBundleLine = { lineId:string; type:"custom_bundle"; productIds:string[]; quantities:Record<string,number>; quantity:number; categoryId?:string };
export type CartLine = ProductLine | BundleLine | CustomBundleLine;
type Store = { favorites:string[]; cart:CartLine[]; toggleFavorite:(id:string)=>void; addProduct:(id:string)=>void; addBundle:(bundleId:string,tier:string)=>void; addCustomBundle:(productIds:string[],quantities:Record<string,number>,categoryId?:string)=>void; updateCustomBundle:(lineId:string,productIds:string[],quantities:Record<string,number>,categoryId?:string)=>void; updateQuantity:(lineId:string,delta:number)=>void; removeLine:(lineId:string)=>void; clearCart:()=>void; openCartDrawer:()=>void; closeCartDrawer:()=>void; cartDrawerOpen:boolean; cartCount:number; favoriteProducts:Product[]; cartTotal:number };
const StoreContext = createContext<Store|null>(null);
const normalize = (raw:unknown):CartLine[] => Array.isArray(raw) ? raw.flatMap((x:any) => x?.type === "product" && typeof x.productId === "string" ? [{lineId:x.lineId||x.productId,type:"product",productId:x.productId,quantity:Math.max(1,x.quantity||1),quantities:{}}] : x?.type === "bundle" ? [{...x,lineId:x.lineId||x.bundleId,quantity:Math.max(1,x.quantity||1),quantities:x.quantities||{}}] : x?.type === "custom_bundle" ? [x] : []) : [];
export function StoreProvider({children}:{children:React.ReactNode}) {
  const [favorites,setFavorites] = useState<string[]>([]); const [cart,setCart] = useState<CartLine[]>([]); const [hydrated,setHydrated] = useState(false); const [cartDrawerOpen,setCartDrawerOpen] = useState(false);
  useEffect(() => { try { setFavorites(JSON.parse(localStorage.getItem("hp-favorites")||"[]")); setCart(normalize(JSON.parse(localStorage.getItem("hp-shared-cart")||"[]"))); } catch { setFavorites([]); setCart([]); } finally { setHydrated(true); } }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("hp-favorites",JSON.stringify(favorites)); }, [favorites,hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("hp-shared-cart",JSON.stringify(cart)); }, [cart,hydrated]);
  const value = useMemo<Store>(() => ({ favorites,cart,cartDrawerOpen,openCartDrawer:()=>setCartDrawerOpen(true),closeCartDrawer:()=>setCartDrawerOpen(false),
    toggleFavorite:(id)=>setFavorites(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]),
    addProduct:(id)=>{setCart(x=>{const line=x.find(i=>i.type==="product"&&i.productId===id);return line?x.map(i=>i===line?{...i,quantity:i.quantity+1}:i):[...x,{lineId:`product-${id}`,type:"product",productId:id,quantity:1,quantities:{}}]});setCartDrawerOpen(true);},
    addBundle:(bundleId,tier)=>{setCart(x=>{const line=x.find(i=>i.type==="bundle"&&i.bundleId===bundleId&&i.tier===tier);return line?x.map(i=>i===line?{...i,quantity:i.quantity+1}:i):[...x,{lineId:`bundle-${bundleId}-${tier}`,type:"bundle",bundleId,tier,quantity:1,quantities:{}}]});setCartDrawerOpen(true);},
    addCustomBundle:(productIds,quantities,categoryId)=>{setCart(x=>[...x,{lineId:`custom-${Date.now()}`,type:"custom_bundle",productIds,quantities,categoryId,quantity:1}]);setCartDrawerOpen(true);},
    updateCustomBundle:(lineId,productIds,quantities,categoryId)=>setCart(x=>x.map(i=>i.lineId===lineId&&i.type==="custom_bundle"?{...i,productIds,quantities,categoryId}:i)),
    updateQuantity:(lineId,delta)=>setCart(x=>x.map(i=>i.lineId===lineId?{...i,quantity:Math.max(1,i.quantity+delta)}:i)), removeLine:(lineId)=>setCart(x=>x.filter(i=>i.lineId!==lineId)), clearCart:()=>setCart([]),
    cartCount:cart.reduce((n,i)=>n+i.quantity,0), favoriteProducts:favorites.map(getProductById).filter(Boolean) as Product[],
    cartTotal:cart.reduce((n,i)=>i.type==="product"?n+(getProductById(i.productId)?.proposed_price_eur||0)*i.quantity:i.type==="bundle"?n+calculateBundleTotal(i.bundleId)*i.quantity:n+i.productIds.reduce((s,id)=>s+(getProductById(id)?.proposed_price_eur||0)*(i.quantities[id]||0),0),0)
  }),[favorites,cart,cartDrawerOpen]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error("useStore must be used within StoreProvider");return value;}
