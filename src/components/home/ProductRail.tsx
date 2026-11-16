"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/state/store";
import type { Product } from "@/types/catalog";
import { CatalogCard } from "@/app/shop/catalog-browser";

/** Carril horizontal con scroll-snap (móvil: deslizar; escritorio: flechas). */
export default function ProductRail({ products }: { products: Product[] }) {
  const { addProduct, favorites, toggleFavorite } = useStore();
  const track = useRef<HTMLUListElement>(null);
  const move = (dir: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="rail">
      <button className="rail-arrow rail-prev" onClick={() => move(-1)} aria-label="Productos anteriores">
        <ChevronLeft size={20} />
      </button>
      <ul className="rail-track" ref={track} data-reveal-stagger>
        {products.map((p) => (
          <li key={p.id}>
            <CatalogCard product={p} favorite={favorites.includes(p.id)} onFavorite={toggleFavorite} onAdd={addProduct} />
          </li>
        ))}
      </ul>
      <button className="rail-arrow rail-next" onClick={() => move(1)} aria-label="Más productos">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
