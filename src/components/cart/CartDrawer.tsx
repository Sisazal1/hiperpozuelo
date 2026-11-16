"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { useStore, type CartLine } from "@/state/store";
import { getProductById } from "@/lib/catalog/products";
import { getBundleById, TIER_LABEL } from "@/lib/catalog/bundles";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { cartSummary, lineTotal } from "@/lib/cart/totals";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useFocusTrap, useTweenedNumber } from "@/components/motion/hooks";

const CLOSE_MS = 280;

export default function CartDrawer() {
  const { cart, cartCount, cartDrawerOpen, closeCartDrawer, updateQuantity, removeLine, addProduct, discountCode, lastAdded } =
    useStore();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const summary = cartSummary(cart, discountCode);
  const subtotal = useTweenedNumber(summary.subtotal);

  useEffect(() => {
    if (cartDrawerOpen) {
      returnFocus.current = document.activeElement as HTMLElement;
      setVisible(true);
      setClosing(false);
      requestAnimationFrame(() => closeButton.current?.focus());
    } else if (visible) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        setVisible(false);
        setClosing(false);
        returnFocus.current?.focus?.();
      }, CLOSE_MS);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartDrawerOpen]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.drawer = "open";
    return () => {
      document.body.style.overflow = previous;
      delete document.documentElement.dataset.drawer;
    };
  }, [visible]);

  const requestClose = () => closeCartDrawer();
  useFocusTrap(panel, visible && !closing, requestClose);

  const remove = (lineId: string) => {
    setRemoving((r) => ({ ...r, [lineId]: true }));
    window.setTimeout(() => {
      removeLine(lineId);
      setRemoving(({ [lineId]: _, ...rest }) => rest);
    }, 240);
  };

  const recommendations = useMemo(() => {
    const ids = cart.flatMap((line) =>
      line.type === "product" ? [line.productId] : line.type === "bundle" ? (getBundleById(line.bundleId)?.product_ids ?? []) : line.productIds,
    );
    const existing = new Set(ids);
    return ids
      .flatMap((id) => getComplementaryProducts(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item, i, all) => !existing.has(item.id) && all.findIndex((c) => c.id === item.id) === i)
      .slice(0, 6);
  }, [cart]);

  if (!visible) return null;
  return (
    <div className={`cart-drawer-layer ${closing ? "is-closing" : ""}`}>
      <button className="cart-drawer-overlay" aria-label="Cerrar cesta" tabIndex={-1} onClick={requestClose} />
      <div ref={panel} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <div className="cart-drawer-header">
          <div>
            <h2 id="cart-drawer-title">Tu cesta</h2>
            <span aria-live="polite">
              {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
            </span>
          </div>
          <button ref={closeButton} className="icon-button" onClick={requestClose} aria-label="Cerrar cesta">
            <X size={22} />
          </button>
        </div>
        <div className="cart-drawer-scroll">
          {cart.length > 0 && (
            <div className={`ship-meter ${summary.freeShippingReached ? "is-complete" : ""}`} aria-live="polite">
              <span className="ship-meter-label">
                {summary.freeShippingReached ? <Check size={16} /> : <Truck size={16} />}
                {summary.freeShippingReached ? (
                  "Tienes el envío gratis"
                ) : (
                  <>
                    Te faltan <strong>{formatEuroPrice(summary.remainingForFreeShipping)}</strong> para el envío gratis
                  </>
                )}
              </span>
              <span className="ship-meter-track">
                <span style={{ transform: `scaleX(${summary.freeShippingProgress / 100})` }} />
              </span>
            </div>
          )}
          {cart.length === 0 ? (
            <div className="cart-drawer-empty">
              <span className="empty-bag" aria-hidden="true">
                <ShoppingBag size={34} strokeWidth={1.4} />
              </span>
              <h3>Tu cesta está vacía</h3>
              <p>Empieza por un pack: una estancia lista en un clic.</p>
              <Link className="btn btn-primary" href="/packs" onClick={requestClose}>
                Ver packs
              </Link>
            </div>
          ) : (
            <>
              <ul className="cart-drawer-lines">
                {cart.map((line, i) => (
                  <DrawerLine
                    key={line.lineId}
                    index={i}
                    line={line}
                    justAdded={lastAdded?.lineId === line.lineId && Date.now() - lastAdded.at < 4000}
                    removing={Boolean(removing[line.lineId])}
                    onQuantity={(delta) => updateQuantity(line.lineId, delta)}
                    onRemove={() => remove(line.lineId)}
                  />
                ))}
              </ul>
              {recommendations.length > 0 && (
                <section className="cart-cross-sell" aria-labelledby="cross-sell-title">
                  <h3 id="cross-sell-title">Combina bien con tu cesta</h3>
                  <div className="cart-cross-sell-track">
                    {recommendations.map((product) => (
                      <article className="cart-recommendation" key={product.id}>
                        <ProductVisual categoryId={product.category_id} subcategory={product.subcategory} image={product.image} name={product.name_es} size="sm" />
                        <strong>{product.name_es}</strong>
                        <span>{formatEuroPrice(product.proposed_price_eur)}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => addProduct(product.id)} aria-label={`Añadir ${product.name_es}`}>
                          <Plus size={15} /> Añadir
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <div className="cart-drawer-footer">
          <div className="cart-drawer-total">
            <span>Subtotal</span>
            <strong>{formatEuroPrice(subtotal)}</strong>
          </div>
          {summary.discount > 0 && (
            <p className="cart-drawer-discount">
              Código {discountCode}: −{formatEuroPrice(summary.discount)} se aplica en el pago
            </p>
          )}
          {cart.length ? (
            <Link className="btn btn-primary btn-block" href="/checkout" onClick={requestClose}>
              Tramitar pedido
            </Link>
          ) : null}
          <button className="cart-continue" onClick={requestClose}>
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  );
}

function lineInfo(line: CartLine) {
  if (line.type === "product") {
    const p = getProductById(line.productId);
    return { title: p?.name_es ?? "Producto", categoryId: p?.category_id ?? "kitchen", subcategory: p?.subcategory, image: p?.image, ids: [] as string[], meta: p?.subcategory };
  }
  if (line.type === "bundle") {
    const b = getBundleById(line.bundleId);
    return {
      title: b?.name_es ?? "Pack",
      categoryId: b?.category_id ?? "kitchen",
      subcategory: undefined,
      image: undefined,
      ids: b?.product_ids ?? [],
      meta: `${TIER_LABEL[line.tier as keyof typeof TIER_LABEL] ?? line.tier} · ${b?.product_ids.length ?? 0} artículos`,
    };
  }
  return { title: "Pack personalizado", categoryId: line.categoryId ?? "kitchen", subcategory: undefined, image: undefined, ids: line.productIds, meta: `${line.productIds.length} productos` };
}

function DrawerLine({
  line,
  index,
  justAdded,
  removing,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  index: number;
  justAdded: boolean;
  removing: boolean;
  onQuantity: (delta: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const info = lineInfo(line);
  const total = useTweenedNumber(lineTotal(line));
  return (
    <li
      className={`cart-drawer-line ${justAdded ? "is-new" : ""} ${removing ? "is-removing" : ""}`}
      style={{ ["--i" as string]: Math.min(index, 8) }}
    >
      <ProductVisual categoryId={info.categoryId} subcategory={info.subcategory} image={info.image} name={info.title} size="sm" className="cart-drawer-thumb" />
      <div className="cart-drawer-line-main">
        <div className="cart-drawer-line-heading">
          <strong>{info.title}</strong>
          <button className="icon-button" onClick={onRemove} aria-label={`Eliminar ${info.title}`}>
            <Trash2 size={16} />
          </button>
        </div>
        {line.type === "product" ? (
          <small className="cart-line-meta">{info.meta}</small>
        ) : (
          <button className="cart-line-expand" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {info.meta} <ChevronDown size={15} className="chev" />
          </button>
        )}
        <div className="cart-drawer-line-meta">
          <div className="quantity-control" role="group" aria-label={`Cantidad de ${info.title}`}>
            <button onClick={() => onQuantity(-1)} disabled={line.quantity <= 1} aria-label={`Reducir cantidad de ${info.title}`}>
              <Minus size={15} />
            </button>
            <span key={line.quantity} className="qty-value" aria-live="polite">
              {line.quantity}
            </span>
            <button onClick={() => onQuantity(1)} aria-label={`Aumentar cantidad de ${info.title}`}>
              <Plus size={15} />
            </button>
          </div>
          <span className="cart-line-total">{formatEuroPrice(total)}</span>
        </div>
        {open && info.ids.length > 0 && (
          <ul className="cart-drawer-contents">
            {info.ids.map((id) => (
              <li key={id}>
                <span>{getProductById(id)?.name_es ?? "Producto no disponible"}</span>
                <span>× {line.type === "custom_bundle" ? (line.quantities[id] ?? 0) : 1}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
