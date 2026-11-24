"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, Minus, Plus, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { useStore, type CartLine } from "@/state/store";
import { getProductById } from "@/lib/catalog/products";
import { getBundleById, TIER_LABEL } from "@/lib/catalog/bundles";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { commerceConfig } from "@/config/commerce";
import { cartSummary, lineTotal, lineUnitPrice } from "@/lib/cart/totals";
import ProductVisual from "@/components/catalog/ProductVisual";
import { useTweenedNumber } from "@/components/motion/hooks";

export default function CartPage() {
  const { cart, cartCount, updateQuantity, removeLine, discountCode, applyDiscountCode, removeDiscountCode, hydrated } = useStore();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const s = cartSummary(cart, discountCode);
  const total = useTweenedNumber(s.finalTotal);

  const apply = () => {
    const value = code.trim().toUpperCase();
    if (value !== commerceConfig.welcomeDiscountCode) {
      setCodeError("Ese código no es válido.");
      return;
    }
    applyDiscountCode(value);
    setCode("");
    setCodeError("");
  };

  return (
    <div className="commerce-page">
      <div className="commerce-container">
        <Link href="/shop" className="back-link">
          <ArrowLeft size={17} /> Seguir comprando
        </Link>
        <div className="commerce-heading" data-reveal>
          <div>
            <span className="eyebrow">Revisión de compra</span>
            <h1>Tu cesta</h1>
          </div>
          {cart.length > 0 && <span className="dev-pill">{`${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}</span>}
        </div>
        {!hydrated ? (
          <div className="skeleton-block" style={{ height: 240 }} aria-hidden="true" />
        ) : cart.length ? (
          <div className="commerce-grid">
            <ul className="cart-list" data-reveal-stagger>
              {cart.map((line) => (
                <CartLineView key={line.lineId} line={line} onChange={updateQuantity} onRemove={removeLine} />
              ))}
            </ul>
            <aside className="order-summary" aria-label="Resumen del pedido">
              <span className="eyebrow">Resumen</span>
              <div className={`ship-meter ${s.freeShippingReached ? "is-complete" : ""}`}>
                <span className="ship-meter-label">
                  {s.freeShippingReached ? <Check size={16} /> : <Truck size={16} />}
                  {s.freeShippingReached ? (
                    "Tienes el envío gratis"
                  ) : (
                    <>
                      Te faltan <strong>{formatEuroPrice(s.remainingForFreeShipping)}</strong> para el envío gratis
                    </>
                  )}
                </span>
                <span className="ship-meter-track">
                  <span style={{ transform: `scaleX(${s.freeShippingProgress / 100})` }} />
                </span>
              </div>
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatEuroPrice(s.subtotal)}</strong>
              </div>
              {s.discount > 0 && (
                <div className="summary-line summary-discount">
                  <span>Descuento {discountCode}</span>
                  <strong>−{formatEuroPrice(s.discount)}</strong>
                </div>
              )}
              <div className="summary-line">
                <span>Envío a domicilio</span>
                <strong>{s.shippingCost ? formatEuroPrice(s.shippingCost) : "Gratis"}</strong>
              </div>
              <p className="summary-note">
                <Store size={14} /> Recogida en tienda gratis: elígela en el siguiente paso.
              </p>
              <div className="cart-coupon">
                {s.discount > 0 ? (
                  <button type="button" onClick={removeDiscountCode} className="cart-coupon-remove">
                    Quitar código {discountCode}
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      apply();
                    }}
                  >
                    <label htmlFor="coupon">Código de descuento</label>
                    <div className="cart-coupon-row">
                      <input
                        id="coupon"
                        value={code}
                        onChange={(event) => {
                          setCode(event.target.value);
                          setCodeError("");
                        }}
                        autoComplete="off"
                        aria-invalid={Boolean(codeError)}
                        aria-describedby={codeError ? "coupon-error" : undefined}
                      />
                      <button type="submit" disabled={!code.trim()}>
                        Aplicar
                      </button>
                    </div>
                    {codeError && (
                      <p id="coupon-error" className="field-error" role="alert">
                        {codeError}
                      </p>
                    )}
                  </form>
                )}
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{formatEuroPrice(total)}</strong>
              </div>
              <Link className="btn btn-primary btn-block btn-lg" href="/checkout">
                Tramitar pedido <ArrowRight size={18} />
              </Link>
              <p className="summary-secure">
                <Lock size={13} /> Pago seguro con Stripe · compra sin cuenta
              </p>
            </aside>
          </div>
        ) : (
          <div className="empty-commerce" data-reveal>
            <span className="empty-bag" aria-hidden="true">
              <ShoppingBag size={34} strokeWidth={1.4} />
            </span>
            <h2>Tu cesta está vacía</h2>
            <p>Empieza por un pack: una estancia lista en un clic.</p>
            <div className="empty-actions">
              <Link className="btn btn-primary" href="/packs">
                Ver packs
              </Link>
              <Link className="btn btn-secondary" href="/shop">
                Explorar la tienda
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CartLineView({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const product = line.type === "product" ? getProductById(line.productId) : undefined;
  const bundle = line.type === "bundle" ? getBundleById(line.bundleId) : undefined;
  const name = product?.name_es || bundle?.name_es || (line.type === "custom_bundle" ? "Pack personalizado" : "Línea no disponible");
  const unit = lineUnitPrice(line) ?? 0;
  const total = useTweenedNumber(lineTotal(line));
  const included = (line.type === "bundle" ? bundle?.product_ids : line.type === "custom_bundle" ? line.productIds : []) || [];
  const categoryId = product?.category_id ?? bundle?.category_id ?? (line.type === "custom_bundle" ? line.categoryId : undefined) ?? "kitchen";
  return (
    <li className={`cart-item ${leaving ? "is-removing" : ""}`} data-reveal>
      <ProductVisual categoryId={categoryId} subcategory={product?.subcategory} image={product?.image} name={name} size="md" className="cart-thumb" />
      <div className="cart-item-main">
        <span className="product-category">
          {line.type === "bundle"
            ? `Pack · ${TIER_LABEL[line.tier as keyof typeof TIER_LABEL] ?? line.tier}`
            : line.type === "custom_bundle"
              ? "Pack personalizado"
              : product?.subcategory}
        </span>
        <h2>{product ? <Link href={`/product/${product.slug}`}>{name}</Link> : name}</h2>
        {line.type !== "product" && (
          <button className="included-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Ocultar" : "Ver"} los {included.length} productos incluidos
          </button>
        )}
        {open && (
          <ul className="cart-contents">
            {included.map((id) => (
              <li key={id}>
                <span>{getProductById(id)?.name_es || "Producto no disponible"}</span>
                <strong>× {line.type === "custom_bundle" ? line.quantities[id] || 0 : 1}</strong>
              </li>
            ))}
          </ul>
        )}
        <div className="cart-item-row">
          <div className="quantity-control" role="group" aria-label={`Cantidad de ${name}`}>
            <button aria-label={`Reducir cantidad de ${name}`} disabled={line.quantity <= 1} onClick={() => onChange(line.lineId, -1)}>
              <Minus size={15} />
            </button>
            <span key={line.quantity} className="qty-value">
              {line.quantity}
            </span>
            <button aria-label={`Aumentar cantidad de ${name}`} onClick={() => onChange(line.lineId, 1)}>
              <Plus size={15} />
            </button>
          </div>
          <div className="cart-line-price">
            {line.quantity > 1 && <span>{formatEuroPrice(unit)} / ud.</span>}
            <strong>{formatEuroPrice(total)}</strong>
          </div>
        </div>
        {line.type === "custom_bundle" && (
          <Link className="edit-pack-link" href={`/build-pack?edit=${encodeURIComponent(line.lineId)}`}>
            Editar pack
          </Link>
        )}
        {line.type === "bundle" && bundle && (
          <Link className="edit-pack-link" href={`/packs/${bundle.category_id}/${bundle.tier}`}>
            Cambiar tamaño
          </Link>
        )}
      </div>
      <button
        className="remove-button"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => onRemove(line.lineId), 240);
        }}
        aria-label={`Eliminar ${name}`}
      >
        <Trash2 size={17} />
      </button>
    </li>
  );
}
