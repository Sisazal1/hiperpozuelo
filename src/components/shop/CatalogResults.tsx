"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import { searchProducts } from "@/lib/catalog/products";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/types/catalog";

const PAGE_SIZE = 12;
const sorts: Record<string, string> = { default: "Recomendados", asc: "Precio: de menor a mayor", desc: "Precio: de mayor a menor", alpha: "Nombre: A–Z" };

/**
 * Filters, sorting and paging live in the URL, so back/forward, refresh and sharing
 * all keep the exact same view (and the header search lands here with ?q=).
 */
export function CatalogResults({ products, scoped = false }: { products: Product[]; scoped?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const sub = params.get("sub") ?? "";
  const sort = sorts[params.get("sort") ?? ""] ? (params.get("sort") as string) : "default";
  const requestedPage = Math.max(1, Number(params.get("page")) || 1);

  const update = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) { if (value) sp.set(key, value); else sp.delete(key); }
    if (!("page" in next)) sp.delete("page");
    const query = sp.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const subs = useMemo(() => [...new Set(products.map((p) => p.subcategory))].sort((a, b) => a.localeCompare(b, "es")), [products]);

  const filtered = useMemo(() => {
    const ids = new Set(products.map((p) => p.id));
    let list = q ? searchProducts(q).filter((p) => ids.has(p.id)) : products;
    if (sub) list = list.filter((p) => p.subcategory === sub);
    return [...list].sort((a, b) =>
      sort === "asc" ? a.proposed_price_eur - b.proposed_price_eur
      : sort === "desc" ? b.proposed_price_eur - a.proposed_price_eur
      : sort === "alpha" ? a.name_es.localeCompare(b.name_es, "es")
      : 0);
  }, [products, q, sub, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(q || sub);

  const goToPage = (target: number) => {
    update({ page: target > 1 ? String(target) : null });
    document.getElementById("results")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div id="results" className="results">
      {scoped && subs.length > 1 && (
        <div className="chip-row chip-row--flush" role="group" aria-label="Subcategorías">
          <button type="button" className={`chip ${!sub ? "is-active" : ""}`} aria-pressed={!sub} onClick={() => update({ sub: null })}>Todo</button>
          {subs.map((item) => (
            <button key={item} type="button" className={`chip ${sub === item ? "is-active" : ""}`} aria-pressed={sub === item} onClick={() => update({ sub: sub === item ? null : item })}>{item}</button>
          ))}
        </div>
      )}

      <div className="toolbar">
        <p className="toolbar__count" role="status" aria-live="polite">
          <strong>{filtered.length}</strong> {filtered.length === 1 ? "producto" : "productos"}
          {q && <> para «{q}»</>}
        </p>
        <label className="toolbar__sort">
          <span>Ordenar</span>
          <select value={sort} onChange={(event) => update({ sort: event.target.value === "default" ? null : event.target.value })}>
            {Object.entries(sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {hasFilters && (
        <div className="active-filters" aria-label="Filtros activos">
          {q && <button type="button" className="pill" onClick={() => update({ q: null })}>Búsqueda: {q} <X size={14} aria-hidden="true" /><span className="sr-only">Quitar búsqueda</span></button>}
          {sub && <button type="button" className="pill" onClick={() => update({ sub: null })}>{sub} <X size={14} aria-hidden="true" /><span className="sr-only">Quitar filtro</span></button>}
          <button type="button" className="link-quiet" onClick={() => update({ q: null, sub: null, sort: null })}>Limpiar todo</button>
        </div>
      )}

      {visible.length ? (
        <>
          <div className="grid-products">
            {visible.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}
          </div>
          {pageCount > 1 && (
            <nav className="pager" aria-label="Paginación">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => goToPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /> Anterior</button>
              <span>Página {page} de {pageCount}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page === pageCount} onClick={() => goToPage(page + 1)}>Siguiente <ChevronRight size={16} aria-hidden="true" /></button>
            </nav>
          )}
        </>
      ) : (
        <div className="empty">
          <span className="empty__icon"><SearchX size={28} aria-hidden="true" /></span>
          <h2>No encontramos productos{q ? <> para «{q}»</> : null}</h2>
          <p>Revisa la ortografía, usa una palabra más general o quita los filtros.</p>
          <div className="empty__actions">
            <button type="button" className="btn btn-primary" onClick={() => update({ q: null, sub: null, sort: null })}>Limpiar filtros</button>
            <Link className="btn btn-secondary" href="/packs">Ver packs</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="results" aria-busy="true" aria-label="Cargando productos">
      <div className="toolbar"><div className="skeleton skeleton--line" style={{ width: 120, margin: 0 }} /></div>
      <div className="grid-products">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton skeleton--media" />
            <div className="skeleton skeleton--line" style={{ width: "40%" }} />
            <div className="skeleton skeleton--line" style={{ width: "80%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
