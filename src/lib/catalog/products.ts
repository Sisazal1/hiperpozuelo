import { catalog } from "./index";
import imageManifest from "@/data/product-images.json";
import type { Product } from "@/types/catalog";

// Solo fotos reales del producto (registradas en product-images.json). Las imágenes de
// ambiente generadas con IA NUNCA se usan como foto de un producto concreto: sin foto, la UI
// muestra el visual de categoría (ProductVisual).
const manifest = imageManifest as Record<string, { widths?: Record<string, { webp: string }> }>;

const ALL: Product[] = catalog.products.map((product) => ({
  ...product,
  image: manifest[product.slug]?.widths?.["800"]?.webp ?? product.image,
}));
const BY_ID = new Map(ALL.map((p) => [p.id, p]));
const BY_SLUG = new Map(ALL.map((p) => [p.slug, p]));

export const getAllProducts = () => ALL;
export const getProductById = (id: string) => BY_ID.get(id);
export const getProductBySlug = (slug: string) => BY_SLUG.get(slug);
export const getProductsByCategory = (categoryId: string) => ALL.filter((p) => p.category_id === categoryId);

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase()
    .trim();
const searchSynonyms: Record<string, string[]> = {
  toalla: ["paño", "textil"],
  pano: ["paño", "textil"],
  sarten: ["cocina"],
  cacerola: ["cocina"],
  utensilios: ["utensilio", "cocina"],
  boli: ["bolígrafo"],
  basura: ["residuos", "bolsas"],
};
const INDEX = ALL.map((p) => ({
  p,
  text: normalizeSearch(`${p.name_es} ${p.name_en} ${p.subcategory} ${p.description_es}`),
  name: normalizeSearch(p.name_es),
}));
export const searchProducts = (query: string) => {
  const q = normalizeSearch(query);
  if (!q) return ALL;
  const terms = [q, ...(searchSynonyms[q] || []).map(normalizeSearch)];
  return INDEX.filter(({ text }) => terms.some((t) => text.includes(t)))
    .sort((a, b) => Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)) || Number(b.name.includes(q)) - Number(a.name.includes(q)))
    .map(({ p }) => p);
};
