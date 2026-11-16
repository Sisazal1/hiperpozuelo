import { catalog } from "./index";
import imageManifest from "@/data/product-images.json";
const ambientByCategory: Record<string, string> = {
  kitchen: "/ai/pack-cocina.webp",
  bathroom: "/ai/pack-bano.webp",
  cleaning: "/ai/pack-limpieza.webp",
  organization: "/ai/pack-limpieza.webp",
  stationery: "/ai/pack-estudio.webp",
  textiles: "/ai/pack-cocina.webp",
  decoration_party: "/ai/pack-estudio.webp",
  diy: "/ai/pack-limpieza.webp",
  garden: "/ai/pack-estudio.webp",
};
export const getAllProducts = () =>
  catalog.products.map((product) => ({
    ...product,
    image:
      (imageManifest as Record<string, { widths?: Record<string, { webp: string }> }>)[product.slug]
        ?.widths?.["800"]?.webp ??
      product.image ??
      ambientByCategory[product.category_id],
  }));
export const getProductById = (id: string) => getAllProducts().find((p) => p.id === id);
export const getProductBySlug = (slug: string) => getAllProducts().find((p) => p.slug === slug);
export const getProductsByCategory = (categoryId: string) =>
  getAllProducts().filter((p) => p.category_id === categoryId);
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
const searchSynonyms: Record<string, string[]> = {
  toalla: ["paño", "textil"],
  pano: ["paño", "textil"],
  sarten: ["cocina"],
  cacerola: ["cocina"],
  utensilios: ["utensilio", "cocina"],
};
export const searchProducts = (query: string) => {
  const q = normalizeSearch(query);
  if (!q) return catalog.products;
  const terms = [q, ...(searchSynonyms[q] || [])];
  return catalog.products.filter((p) =>
    terms.some((term) =>
      normalizeSearch(`${p.name_es} ${p.name_en} ${p.subcategory} ${p.description_es}`).includes(
        normalizeSearch(term),
      ),
    ),
  );
};
