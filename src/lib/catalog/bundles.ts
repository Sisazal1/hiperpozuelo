import { catalog } from "./index";
import { getProductById } from "./products";
import type { Bundle } from "@/types/catalog";
export const getAllBundles = () => catalog.bundles;
export const getBundleById = (id:string) => catalog.bundles.find(b=>b.id===id);
export const getBundlesByCategory = (categoryId:string) => catalog.bundles.filter(b=>b.category_id===categoryId);
export const calculateBundleTotal = (bundle:Bundle|string) => { const item=typeof bundle === "string" ? getBundleById(bundle) : bundle; if(!item) return 0; return item.product_ids.reduce((sum,id)=>sum+(getProductById(id)?.proposed_price_eur ?? 0),0); };
