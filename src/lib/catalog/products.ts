import { catalog } from "./index";
export const getAllProducts = () => catalog.products;
export const getProductById = (id:string) => catalog.products.find(p=>p.id===id);
export const getProductBySlug = (slug:string) => catalog.products.find(p=>p.slug===slug);
export const getProductsByCategory = (categoryId:string) => catalog.products.filter(p=>p.category_id===categoryId);
const normalizeSearch = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
const searchSynonyms: Record<string, string[]> = { toalla: ["paño", "textil"], pano: ["paño", "textil"], sarten: ["cocina"], cacerola: ["cocina"], utensilios: ["utensilio", "cocina"] };
export const searchProducts = (query:string) => { const q=normalizeSearch(query); if (!q) return catalog.products; const terms = [q, ...(searchSynonyms[q] || [])]; return catalog.products.filter(p=>terms.some(term=>normalizeSearch(`${p.name_es} ${p.name_en} ${p.subcategory} ${p.description_es}`).includes(normalizeSearch(term)))); };
