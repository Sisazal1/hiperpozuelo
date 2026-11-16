import { catalog } from "./index";
// Solo categorías con al menos un producto: una categoría vacía (p. ej. "Jardín y exterior")
// no se enlaza ni se publica hasta que tenga catálogo.
const withProducts = new Set(catalog.products.map((p) => p.category_id));
const VISIBLE = catalog.categories.filter((c) => withProducts.has(c.id));
export const getAllCategories = () => VISIBLE;
export const getCategoryById = (id: string) => VISIBLE.find((c) => c.id === id);
export const getCategoryBySlug = (slug: string) => VISIBLE.find((c) => (c.slug ?? c.id) === slug);
