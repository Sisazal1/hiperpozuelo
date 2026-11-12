import { getProductById } from "./products";
export const getComplementaryProducts = (productId:string) => getProductById(productId)?.cross_sell_ids.map(getProductById).filter(Boolean) ?? [];
export const getProductsForBundle = (bundleProductIds:string[]) => bundleProductIds.flatMap(id=>getComplementaryProducts(id)).filter((p,i,a)=>p && a.findIndex(x=>x?.id===p.id)===i);
