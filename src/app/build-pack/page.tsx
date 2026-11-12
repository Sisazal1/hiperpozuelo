"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { getAllProducts } from "@/lib/catalog/products";
import { getAllCategories } from "@/lib/catalog/categories";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { useStore } from "@/state/store";

export default function BuildPackPage() {
  const products = getAllProducts().filter((p) => p.pack_eligible);
  const categories = getAllCategories();
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addCustomBundle, updateCustomBundle, cart } = useStore();
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("edit"); const line = cart.find((x) => x.lineId === id && x.type === "custom_bundle"); if (line && line.type === "custom_bundle") { setEditingId(line.lineId); setSelected(line.quantities); if (line.categoryId) setCategory(line.categoryId); } }, [cart]);
  const visible = products.filter((p) => p.category_id === category);
  const total = Object.entries(selected).reduce((sum, [id, quantity]) => sum + (products.find((p) => p.id === id)?.proposed_price_eur ?? 0) * quantity, 0);
  const change = (id: string, delta: number) => setSelected((current) => { const quantity = Math.max(0, (current[id] ?? 0) + delta); const next = { ...current }; if (quantity) next[id] = quantity; else delete next[id]; return next; });
  const save = () => { if (!Object.keys(selected).length) return; if (editingId) updateCustomBundle(editingId, Object.keys(selected), selected, category); else addCustomBundle(Object.keys(selected), selected, category); window.setTimeout(() => { window.location.href = "/cart"; }, 100); };
  return <main className="builder-page"><header className="builder-header"><Link href="/shop" className="back-link"><ArrowLeft size={17}/> Volver al catálogo</Link><span className="eyebrow">Build your own pack · Demo</span><h1>{editingId ? "Edita tu pack" : "Crea tu pack"}</h1><p>Selecciona productos del catálogo provisional y personaliza tu solución.</p></header><div className="builder-layout"><section className="builder-selection"><div className="pack-tabs" role="tablist">{categories.map((c) => <button key={c.id} role="tab" aria-selected={category === c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)}>{c.name_es}</button>)}</div><p className="dev-notice">Solo se muestran productos `pack_eligible`. Precios orientativos, sin compra real.</p><div className="builder-products">{visible.map((p) => <article className={`builder-product ${selected[p.id] ? "chosen" : ""}`} key={p.id}><div className="builder-image">Imagen pendiente</div><div className="builder-product-info"><span className="product-category">{p.subcategory}</span><h3>{p.name_es}</h3><p>{formatEuroPrice(p.proposed_price_eur)} · Precio orientativo</p>{selected[p.id] ? <div className="quantity-control"><button aria-label="Reducir cantidad" onClick={() => change(p.id, -1)}><Minus size={15}/></button><strong>{selected[p.id]}</strong><button aria-label="Aumentar cantidad" onClick={() => change(p.id, 1)}><Plus size={15}/></button></div> : <button className="builder-add" onClick={() => change(p.id, 1)}>Añadir al pack <Plus size={16}/></button>}</div></article>)}</div></section><aside className="pack-summary"><span className="eyebrow">Tu selección</span><h2>Pack personalizado</h2><p>{Object.values(selected).reduce((a, b) => a + b, 0)} artículos</p>{Object.entries(selected).map(([id, quantity]) => <div className="summary-item" key={id}><strong>{products.find((p) => p.id === id)?.name_es}</strong><small>x{quantity}</small></div>)}<div className="summary-total"><span>Total estimado</span><strong>{formatEuroPrice(total)}</strong></div><button className="summary-cta" disabled={!Object.keys(selected).length} onClick={save}><ShoppingBag size={16}/> {editingId ? "Guardar cambios" : "Añadir pack al carrito demo"}</button><small>El pedido real permanece deshabilitado.</small></aside></div></main>;
}
