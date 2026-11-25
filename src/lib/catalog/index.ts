import seed from "@/data/seed/hiper-pozuelo-catalogo-estimado.json";
import type { CatalogSeed } from "@/types/catalog";
export const catalog = seed as unknown as CatalogSeed;
export const catalogNotice =
  "Catálogo de demostración: productos, precios y disponibilidad orientativos, pendientes de validación.";
