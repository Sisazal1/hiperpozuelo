import { catalog } from "./index";
export const getAllCategories = () => catalog.categories;
export const getCategoryById = (id:string) => catalog.categories.find(c=>c.id===id);
export const getCategoryBySlug = (slug:string) => catalog.categories.find(c=>(c.slug ?? c.id)===slug);
