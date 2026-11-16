"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Heart, Search, ShoppingBag, X } from "lucide-react";
import { getAllCategories } from "@/lib/catalog/categories";
import { searchProducts } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { useStore } from "@/state/store";
import type { Product } from "@/types/catalog";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useAddedFeedback } from "@/components/motion/hooks";

export function CatalogBrowser({
  products,
  title,
  intro,
  categoryId,
}: {
  products: Product[];
  title: string;
  intro: string;
  categoryId?: string;
}) {
  const { addProduct, favorites, toggleFavorite } = useStore();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("default");
  const [category, setCategory] = useState(categoryId ?? "");
  const [sub, setSub] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") || "");
    setSort(params.get("sort") || "default");
  }, []);
  useEffect(() => {
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    q ? params.set("q", q) : params.delete("q");
    sort !== "default" ? params.set("sort", sort) : params.delete("sort");
    const next = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [q, sort, category, sub]);
  const filtered = useMemo(() => {
    let list = q
      ? searchProducts(q).filter((product) => products.some((item) => item.id === product.id))
      : products;
    if (category) list = list.filter((product) => product.category_id === category);
    if (sub) list = list.filter((product) => product.subcategory === sub);
    return [...list].sort((a, b) =>
      sort === "asc"
        ? a.proposed_price_eur - b.proposed_price_eur
        : sort === "desc"
          ? b.proposed_price_eur - a.proposed_price_eur
          : sort === "alpha"
            ? a.name_es.localeCompare(b.name_es)
            : 0,
    );
  }, [q, sort, category, sub, products]);
  const subs = [
    ...new Set(
      products
        .filter((product) => !category || product.category_id === category)
        .map((product) => product.subcategory),
    ),
  ];
  const clearFilters = () => {
    setQ("");
    setCategory(categoryId ?? "");
    setSub("");
    setSort("default");
    setPage(1);
  };
  const pageSize = 16;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="catalog-page">
      <div className="catalog-container">
        <span className="eyebrow" data-reveal>
          {categoryId ? "Categoría" : "Todo el catálogo"}
        </span>
        <h1 data-reveal>{title}</h1>
        <p data-reveal>{intro}</p>
        <nav className="catalog-categories" aria-label="Categorías">
          {getAllCategories().map((cat) => (
            <Link className={category === cat.id ? "active" : ""} key={cat.id} href={`/category/${cat.id}`}>
              {cat.name_es}
            </Link>
          ))}
        </nav>
        <div className="catalog-toolbar">
          <label className="catalog-search">
            <Search size={17} />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar productos"
              aria-label="Buscar productos"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </label>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {getAllCategories().map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_es}
              </option>
            ))}
          </select>
          {subs.length > 1 && (
            <select
              value={sub}
              onChange={(event) => {
                setSub(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por subcategoría"
            >
              <option value="">Subcategoría</option>
              {subs.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          )}
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            aria-label="Ordenar productos"
          >
            <option value="default">Orden recomendado</option>
            <option value="asc">Precio ascendente</option>
            <option value="desc">Precio descendente</option>
            <option value="alpha">A–Z</option>
          </select>
        </div>
        <div className="catalog-result-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
        </div>
        {filtered.length ? (
          <>
            <div className="catalog-grid" key={`${page}-${category}-${sub}-${sort}-${q}`} data-reveal-stagger>
              {visible.map((product) => (
                <CatalogCard
                  key={product.id}
                  product={product}
                  favorite={favorites.includes(product.id)}
                  onFavorite={toggleFavorite}
                  onAdd={addProduct}
                />
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="catalog-pagination" aria-label="Paginación">
                <button
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {pageCount}
                </span>
                <button
                  disabled={page === pageCount}
                  onClick={() => {
                    setPage(page + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Siguiente
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="empty-commerce">
            <h2>No encontramos productos</h2>
            <p>Prueba con otra búsqueda o limpia los filtros.</p>
            <button className="btn btn-primary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function CatalogCard({
  product,
  favorite = false,
  onFavorite,
  onAdd,
}: {
  product: Product;
  favorite?: boolean;
  onFavorite?: (id: string) => void;
  onAdd?: (id: string) => void;
}) {
  const [added, flash] = useAddedFeedback();
  return (
    <article className="catalog-card" data-reveal>
      <Link href={`/product/${product.slug}`} className="catalog-card-link">
        <div className="catalog-image">
          <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} />
        </div>
        <div className="catalog-card-info">
          <span className="product-category">{product.subcategory}</span>
          <h2>{product.name_es}</h2>
          <strong className="price">{formatEuroPrice(product.proposed_price_eur)}</strong>
        </div>
      </Link>
      {onFavorite && (
        <button
          className={`favorite-button ${favorite ? "is-saved" : ""}`}
          onClick={() => onFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Quitar ${product.name_es} de favoritos` : `Añadir ${product.name_es} a favoritos`}
        >
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
      )}
      {onAdd && (
        <button
          className={`add-button ${added ? "is-added" : ""}`}
          onClick={() => {
            onAdd(product.id);
            flash();
          }}
          aria-label={added ? `Añadido a la cesta: ${product.name_es}` : `Añadir a la cesta: ${product.name_es}`}
        >
          {added ? <Check size={15} /> : <ShoppingBag size={15} />} {added ? "Añadido" : "Añadir a la cesta"}
        </button>
      )}
    </article>
  );
}
