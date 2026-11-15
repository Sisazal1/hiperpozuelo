"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { getAllCategories } from "@/lib/catalog/categories";
import { searchProducts } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { useStore } from "@/state/store";
import { CategoryIcon, toneClass } from "@/components/ui/CategoryIcon";

const categories = getAllCategories();

/**
 * Header search. Enter navigates to /shop?q=… and the text stays in the field;
 * on /shop the field always mirrors the URL, so the query is never lost.
 */
function SearchBox({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = pathname === "/shop" ? params.get("q") ?? "" : "";
  const [value, setValue] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(urlQuery); }, [urlQuery]);

  const trimmed = value.trim();
  const results = useMemo(() => (trimmed.length >= 2 ? searchProducts(trimmed).slice(0, 5) : []), [trimmed]);
  const open = focused && trimmed.length >= 2;

  const go = (event: React.FormEvent) => {
    event.preventDefault();
    const chosen = active >= 0 ? results[active] : undefined;
    router.push(chosen ? `/product/${chosen.slug}` : trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
    setFocused(false);
    setActive(-1);
    input.current?.blur();
    onDone?.();
  };

  return (
    <div
      className="search"
      ref={wrap}
      onBlur={(event) => { if (!wrap.current?.contains(event.relatedTarget as Node | null)) { setFocused(false); setActive(-1); } }}
    >
      <form role="search" onSubmit={go}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          name="q"
          value={value}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Busca utensilios, baño, limpieza…"
          aria-label="Buscar productos"
          aria-expanded={open}
          aria-controls="search-suggestions"
          onFocus={() => setFocused(true)}
          onChange={(event) => { setValue(event.target.value); setActive(-1); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActive((i) => (i + 1) % results.length); }
            if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)); }
            if (event.key === "Escape") { setFocused(false); input.current?.blur(); }
          }}
        />
        {value && (
          <button type="button" className="search__clear" aria-label="Borrar búsqueda" onClick={() => { setValue(""); input.current?.focus(); }}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="search__submit" aria-label="Buscar">Buscar</button>
      </form>
      {open && (
        <div className="search__panel" id="search-suggestions" onMouseDown={(event) => event.preventDefault()}>
          {results.length ? (
            <>
              <ul>
                {results.map((product, index) => (
                  <li key={product.id}>
                    <Link href={`/product/${product.slug}`} className={index === active ? "is-active" : ""} onClick={() => { setFocused(false); onDone?.(); }}>
                      <span className={`search__icon ${toneClass(product.category_id)}`}><CategoryIcon id={product.category_id} size={18} /></span>
                      <span className="search__name">{product.name_es}<small>{product.subcategory}</small></span>
                      <span className="price">{formatEuroPrice(product.proposed_price_eur)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="search__all" href={`/shop?q=${encodeURIComponent(trimmed)}`} onClick={() => { setFocused(false); onDone?.(); }}>
                Ver todos los resultados <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="search__empty">No encontramos «{trimmed}». Prueba con otra palabra o <Link href="/shop">explora la tienda</Link>.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GlobalNavbar() {
  const pathname = usePathname();
  const { cartCount, favorites, hydrated, openCartDrawer } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [bump, setBump] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const header = useRef<HTMLElement>(null);
  const previousCount = useRef(0);

  useEffect(() => { setMenuOpen(false); setMobileOpen(false); setMobileSearch(false); }, [pathname]);

  useEffect(() => {
    if (hydrated && cartCount > previousCount.current && previousCount.current > 0) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 450);
      previousCount.current = cartCount;
      return () => window.clearTimeout(timer);
    }
    previousCount.current = cartCount;
  }, [cartCount, hydrated]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setMobileOpen(false); } };
    const onPointer = (event: MouseEvent) => { if (!header.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onPointer); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const openMenu = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setMenuOpen(true); };
  const scheduleClose = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setMenuOpen(false), 160); };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={`site-header ${mobileSearch ? "has-search" : ""}`} ref={header}>
      <div className="container site-header__bar">
        <button type="button" className="icon-btn mobile-only" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>
          <Menu size={22} aria-hidden="true" />
        </button>
        <Link className="logo" href="/" aria-label="Hiper Pozuelo, ir al inicio">
          <Image src="/brand/hiper-pozuelo-logo-transparent.png" alt="" width={190} height={41} priority />
        </Link>

        <div className="site-search">
          <Suspense fallback={<div className="search search--skeleton" aria-hidden="true" />}>
            <SearchBox onDone={() => setMobileSearch(false)} />
          </Suspense>
        </div>

        <div className="site-actions">
          <button type="button" className="icon-btn mobile-only" aria-label={mobileSearch ? "Cerrar búsqueda" : "Abrir búsqueda"} aria-expanded={mobileSearch} onClick={() => setMobileSearch((v) => !v)}>
            {mobileSearch ? <X size={22} aria-hidden="true" /> : <Search size={22} aria-hidden="true" />}
          </button>
          <Link className="action desktop-only" href="/account"><UserRound size={22} aria-hidden="true" /><span>Cuenta</span></Link>
          <Link className="action desktop-only" href="/favorites" aria-label={`Favoritos${hydrated && favorites.length ? `, ${favorites.length}` : ""}`}>
            <Heart size={22} aria-hidden="true" /><span>Favoritos</span>
            {hydrated && favorites.length > 0 && <b className="badge" aria-hidden="true">{favorites.length}</b>}
          </Link>
          <Link
            className="action action--cart"
            href="/cart"
            aria-label={`Abrir cesta${hydrated && cartCount ? `, ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}` : ""}`}
            onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openCartDrawer(); }
            }}
          >
            <ShoppingBag size={22} aria-hidden="true" /><span className="desktop-only">Cesta</span>
            {hydrated && cartCount > 0 && <b className={`badge ${bump ? "is-bumping" : ""}`} aria-hidden="true">{cartCount}</b>}
          </Link>
        </div>
      </div>

      <nav className="site-nav desktop-only" aria-label="Principal">
        <div className="container site-nav__row">
          <Link href="/shop" className={isActive("/shop") ? "is-current" : ""}>Tienda</Link>
          <Link href="/packs" className={isActive("/packs") ? "is-current" : ""}>Packs</Link>
          <div className="site-nav__drop" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
            <button type="button" className={menuOpen || isActive("/category") ? "is-current" : ""} aria-expanded={menuOpen} aria-controls="category-menu" onClick={() => setMenuOpen((v) => !v)}>
              Categorías <ChevronDown size={15} aria-hidden="true" className="chev" />
            </button>
          </div>
          <Link href="/build-pack" className={isActive("/build-pack") ? "is-current" : ""}>Crea tu pack</Link>
          <span className="site-nav__note">Envío gratis desde 30 € · Recogida en tienda gratis</span>
        </div>
        <div id="category-menu" className={`mega ${menuOpen ? "is-open" : ""}`} onMouseEnter={openMenu} onMouseLeave={scheduleClose} hidden={!menuOpen}>
          <div className="container mega__grid">
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.id}`} onClick={() => setMenuOpen(false)}>
                <span className={`mega__icon ${toneClass(category.id)}`}><CategoryIcon id={category.id} size={22} /></span>
                <span><strong>{category.name_es}</strong><small>{category.description_es}</small></span>
              </Link>
            ))}
          </div>
          <div className="container mega__foot"><Link href="/shop" onClick={() => setMenuOpen(false)}>Ver toda la tienda <ArrowRight size={15} aria-hidden="true" /></Link></div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="sheet-layer" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="sheet-overlay" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />
          <aside className="sheet">
            <div className="sheet__head">
              <strong>Menú</strong>
              <button type="button" className="icon-btn" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}><X size={22} aria-hidden="true" /></button>
            </div>
            <nav className="sheet__nav" aria-label="Menú móvil">
              <Link href="/shop">Tienda</Link>
              <Link href="/packs">Packs</Link>
              <Link href="/build-pack">Crea tu pack</Link>
              <p className="sheet__label">Categorías</p>
              {categories.map((category) => (
                <Link key={category.id} href={`/category/${category.id}`} className="sheet__cat">
                  <span className={`mega__icon ${toneClass(category.id)}`}><CategoryIcon id={category.id} size={20} /></span>{category.name_es}
                </Link>
              ))}
              <p className="sheet__label">Mi espacio</p>
              <Link href="/favorites">Favoritos{hydrated && favorites.length ? ` (${favorites.length})` : ""}</Link>
              <Link href="/account">Cuenta y pedidos</Link>
              <Link href="/envios-y-devoluciones">Envíos y devoluciones</Link>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
