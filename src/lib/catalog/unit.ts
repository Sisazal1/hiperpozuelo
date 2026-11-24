import type { Product } from "@/types/catalog";

/** Unidades del formato, solo si el nombre lo dice: «(3 unidades)», «(pack de 10)», «(2 rollos)», «(4 piezas)». */
export function unitsOf(product: Product): { count: number; word: string } | null {
  const m = product.name_es.match(/\((?:pack de )?(\d+)\s*(unidades|piezas|rollos)?\)/i);
  if (!m || Number(m[1]) < 2) return null;
  return { count: Number(m[1]), word: m[2]?.toLowerCase() ?? "unidades" };
}
const SINGULAR: Record<string, string> = { unidades: "unidad", piezas: "pieza", rollos: "rollo" };
export const singular = (word: string) => SINGULAR[word] ?? "unidad";
