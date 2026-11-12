import { getAllProducts } from "@/lib/catalog/products";
import { CatalogBrowser } from "./catalog-browser";
export default function ShopPage(){return <CatalogBrowser products={getAllProducts()} title="Tienda" intro="Descubre todo lo que necesitas para tu hogar y tu día a día."/>}
