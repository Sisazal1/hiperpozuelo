import Image from "next/image";
import { CategoryIcon, toneClass } from "./CategoryIcon";
import type { Product } from "@/types/catalog";

/**
 * Product picture. When `product.image` exists (e.g. "/products/espatula-silicona.webp")
 * the real photo is shown; otherwise a clean category tile is used. No fake photography.
 */
export function ProductVisual({ product, sizes = "(max-width: 640px) 50vw, 25vw", priority = false }: { product: Product; sizes?: string; priority?: boolean }) {
  if (product.image) {
    return (
      <span className="visual visual--photo">
        <Image src={product.image} alt={product.name_es} fill sizes={sizes} priority={priority} />
      </span>
    );
  }
  return (
    <span className={`visual ${toneClass(product.category_id)}`} aria-hidden="true">
      <CategoryIcon id={product.category_id} size={40} />
    </span>
  );
}

export function CategoryVisual({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <span className={`visual ${toneClass(id)}`} aria-hidden="true">
      <CategoryIcon id={id} size={size} />
    </span>
  );
}
