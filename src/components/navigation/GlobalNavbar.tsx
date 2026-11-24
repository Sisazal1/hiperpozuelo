"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { getAllCategories } from "@/lib/catalog/categories";
import { searchProducts } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { useStore } from "@/state/store";
import ProductVisual, { categoryIcon } from "@/components/catalog/ProductVisual";
import { useFocusTrap } from "@/components/motion/hooks";

const categories = getAllCategories();

export default function GlobalNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [cartPulse, setCartPulse] = useState(false);
  const categoryButton = useRef<HTMLButtonElement>(null);
  const categoryPanel = useRef<HTMLDivElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const listId = useId();
  const { cartCount, favorites, openCartDrawer } = useStore();
  const results = useMemo(() => (query.trim() ? searchProducts(query).slice(0, 6) : []), [query]);

  // Cierra todo al cambiar de ruta.
  useEffect(() => {
    setCategoryMenu(false);
    setMobileMenu(false);
    setMobileSearch(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!cartCount) return;
    setCartPulse(true);
    const timer = window.setTimeout(() => setCartPulse(false), 520);
    return () => window.clearTimeout(timer);
  }, [cartCount]);

  // Header que se esconde al bajar y vuelve al subir (Apple/Huel). Solo transform.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const el = header.current;
        if (!el) return;
        el.dataset.scrolled = y > 8 ? "true" : "false";
        const hide = y > 240 && y > last + 4 && !document.documentElement.dataset.drawer;
        const show = y < last - 4 || y < 240;
        if (hide) el.dataset.hidden = "true";
        else if (show) el.dataset.hidden = "false";
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!categoryMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryMenu(false);
        categoryButton.current?.focus();
      }
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!categoryPanel.current?.contains(t) && !categoryButton.current?.contains(t)) setCategoryMenu(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [categoryMenu]);

  const closeMobileMenu = () => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMobileMenu(false);
      setMenuClosing(false);
    }, 260);
  };
  useFocusTrap(drawer, mobileMenu, closeMobileMenu);
  useEffect(() => {
    if (!mobileMenu) return;
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => drawer.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      document.body.style.overflow = o;
    };
  }, [mobileMenu]);

  const submitSearch = () => {
    const q = query.trim();
    if (active >= 0 && results[active]) router.push(`/product/${results[active].slug}`);
    else router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    setQuery("");
    setActive(-1);
  };

  return (
    <>
      <header className="nav-shell" ref={header} data-hidden="false">
        <div className="main-nav">
          <button className="mobile-icon" aria-label="Abrir menú" aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)}>
            <Menu />
          </button>
          <Link className="logo-wrap" href="/" aria-label="Hiper Pozuelo, inicio">
            <Image src="/brand/hiper-pozuelo-logo-transparent.png" alt="Hiper Pozuelo" width={190} height={41} priority />
          </Link>
          <div className={`nav-search-wrap ${mobileSearch ? "mobile-search-open" : ""}`}>
            <form
              className="search-box"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <Search size={18} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(results.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(-1, a - 1));
                  } else if (e.key === "Escape") setQuery("");
                }}
                role="combobox"
                aria-expanded={Boolean(query)}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                aria-label="Buscar productos"
                placeholder="¿Qué estás buscando?"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Borrar búsqueda">
                  <X size={16} />
                </button>
              )}
            </form>
            {query && (
              <div className="search-results">
                <ul id={listId} role="listbox" aria-label="Sugerencias">
                  {results.map((p, i) => (
                    <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                      <Link href={`/product/${p.slug}`} className={active === i ? "is-active" : ""} onClick={() => setQuery("")}>
                        <ProductVisual categoryId={p.category_id} subcategory={p.subcategory} image={p.image} size="sm" />
                        <span>
                          {p.name_es}
                          <small>{p.subcategory}</small>
                        </span>
                        <b>{formatEuroPrice(p.proposed_price_eur)}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
                {!results.length && <p className="search-empty">Nada con «{query}». Prueba con otra palabra.</p>}
                <Link className="search-all" href={`/shop?q=${encodeURIComponent(query)}`} onClick={() => setQuery("")}>
                  Ver todos los resultados <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
          <div className="nav-actions">
            <Link className="nav-action desktop-only" href="/account">
              <UserRound aria-hidden="true" />
              <span>Cuenta</span>
            </Link>
            <Link className="nav-action desktop-only" href="/favorites" aria-label={`Favoritos${favorites.length ? `, ${favorites.length} guardados` : ""}`}>
              <Heart aria-hidden="true" />
              <span>Favoritos</span>
              {favorites.length > 0 && <b className="nav-count">{favorites.length}</b>}
            </Link>
            <button
              className="mobile-icon"
              aria-label={mobileSearch ? "Cerrar búsqueda" : "Abrir búsqueda"}
              aria-expanded={mobileSearch}
              onClick={() => setMobileSearch((v) => !v)}
            >
              {mobileSearch ? <X /> : <Search />}
            </button>
            <button
              className="nav-action cart-action"
              onClick={openCartDrawer}
            >
              <span className="sr-only">{cartCount ? `Cesta, ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}` : "Cesta vacía"}</span>
              <ShoppingBag aria-hidden="true" />
              <span className="desktop-only" aria-hidden="true">
                Cesta
              </span>
              {cartCount > 0 && (
                <b className={`nav-count ${cartPulse ? "is-pulsing" : ""}`} key={cartCount} aria-hidden="true">
                  {cartCount}
                </b>
              )}
            </button>
          </div>
        </div>
        <nav className="category-nav" aria-label="Principal" onMouseLeave={() => setCategoryMenu(false)}>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Inicio
          </Link>
          <Link href="/packs" aria-current={pathname.startsWith("/packs") ? "page" : undefined}>
            Packs
          </Link>
          <Link href="/shop" aria-current={pathname.startsWith("/shop") ? "page" : undefined}>
            Tienda
          </Link>
          <button
            ref={categoryButton}
            className={categoryMenu ? "active" : ""}
            aria-expanded={categoryMenu}
            aria-controls="category-menu"
            onMouseEnter={() => setCategoryMenu(true)}
            onClick={() => setCategoryMenu((v) => !v)}
          >
            Categorías <ChevronDown size={15} className="chev" aria-hidden="true" />
          </button>
          {categoryMenu && (
            <div id="category-menu" ref={categoryPanel} className="category-mega" onMouseEnter={() => setCategoryMenu(true)}>
              <ul>
                {categories.map((c, i) => {
                  const Icon = categoryIcon(c.id);
                  return (
                    <li key={c.id} style={{ ["--i" as string]: i }}>
                      <Link href={`/category/${c.id}`} onClick={() => setCategoryMenu(false)}>
                        <span className={`mega-icon pv-cat-${c.id}`} aria-hidden="true">
                          <Icon size={18} strokeWidth={1.5} />
                        </span>
                        {c.name_es}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link href="/build-pack" aria-current={pathname.startsWith("/build-pack") ? "page" : undefined}>
            Crea tu pack
          </Link>
        </nav>
      </header>
      {mobileMenu && (
        <div className={`drawer-backdrop ${menuClosing ? "is-closing" : ""}`} onClick={closeMobileMenu}>
          <div ref={drawer} className="drawer" role="dialog" aria-modal="true" aria-label="Menú" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <strong>Menú</strong>
              <button className="mobile-icon" onClick={closeMobileMenu} aria-label="Cerrar menú">
                <X />
              </button>
            </div>
            <nav aria-label="Menú móvil">
              <ul className="drawer-links">
                {[
                  ["/", "Inicio"],
                  ["/packs", "Packs"],
                  ["/shop", "Tienda"],
                  ["/build-pack", "Crea tu pack"],
                  ["/favorites", `Favoritos${favorites.length ? ` (${favorites.length})` : ""}`],
                  ["/account", "Cuenta"],
                ].map(([href, label], i) => (
                  <li key={href} style={{ ["--i" as string]: i }}>
                    <Link href={href} onClick={closeMobileMenu}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <strong className="drawer-subtitle">Categorías</strong>
              <ul className="drawer-cats">
                {categories.map((c, i) => {
                  const Icon = categoryIcon(c.id);
                  return (
                    <li key={c.id} style={{ ["--i" as string]: i + 6 }}>
                      <Link href={`/category/${c.id}`} onClick={closeMobileMenu}>
                        <span className={`mega-icon pv-cat-${c.id}`} aria-hidden="true">
                          <Icon size={18} strokeWidth={1.5} />
                        </span>
                        {c.name_es}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
