"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { AccountLayout } from "../account-layout";
import { useStore, type CartLine } from "@/state/store";
import { getProductById } from "@/lib/catalog/products";
import { getBundleById } from "@/lib/catalog/bundles";
import { formatEuroPrice } from "@/lib/catalog/pricing";
type StoredOrder = {
  id: string;
  createdAt: string;
  delivery: "delivery" | "collect";
  customer: { email: string };
  cart: CartLine[];
  subtotal: number;
  logistics: number | null;
  total: number;
};
export default function Orders() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { addProduct, addBundle, addCustomBundle, openCartDrawer } = useStore();
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hp-demo-orders") || "{}");
      setOrders(Object.values(raw) as StoredOrder[]);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const find = () => {
    const value = query.trim().toLowerCase();
    if (!value) {
      setError("Introduce el número de pedido o el email.");
      return;
    }
    const match = orders.find(
      (o) => o.id.toLowerCase() === value || o.customer.email.toLowerCase() === value,
    );
    if (!match) setError("No encontramos un pedido con esos datos.");
    else setError("");
  };
  const repeat = (order: StoredOrder) => {
    let missing = 0;
    order.cart.forEach((line) => {
      if (line.type === "product") {
        if (getProductById(line.productId))
          for (let i = 0; i < line.quantity; i += 1) addProduct(line.productId);
        else missing += 1;
      } else if (line.type === "bundle") {
        if (getBundleById(line.bundleId))
          for (let i = 0; i < line.quantity; i += 1) addBundle(line.bundleId, line.tier);
        else missing += 1;
      } else {
        const ids = line.productIds.filter((id) => getProductById(id));
        if (ids.length) addCustomBundle(ids, line.quantities, line.categoryId);
        missing += line.productIds.length - ids.length;
      }
    });
    if (missing) setError(`${missing} producto(s) ya no están disponibles en el catálogo.`);
    openCartDrawer();
  };
  return (
    <AccountLayout title="Mis pedidos">
      <section className="order-search">
        <h2>Busca un pedido</h2>
        <p>Usa el número de pedido o el email utilizado al comprar.</p>
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número de pedido o email"
            aria-label="Número de pedido o email"
          />
          <button className="btn btn-primary" onClick={find}>
            <Search size={17} /> Buscar
          </button>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {loading ? (
        <div className="order-skeleton" aria-label="Cargando pedidos">
          <i />
          <i />
          <i />
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-commerce">
          <ShoppingBag size={32} />
          <h2>Aún no tienes pedidos</h2>
          <p>Cuando completes un pedido, aparecerá aquí.</p>
          <Link className="btn btn-primary" href="/shop">
            Explorar la tienda
          </Link>
        </div>
      ) : (
        <div className="order-list">
          {orders
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((order) => (
              <article className="account-order" key={order.id}>
                <div>
                  <span className="eyebrow">{order.id}</span>
                  <h2>Pedido del {new Date(order.createdAt).toLocaleDateString("es-ES")}</h2>
                  <p>
                    {order.delivery === "collect" ? "Recogida en tienda" : "Entrega a domicilio"} ·{" "}
                    {order.cart.length} líneas
                  </p>
                  <strong>{formatEuroPrice(order.total)}</strong>
                </div>
                <div>
                  <span className="order-status">Pedido registrado</span>
                  <button className="btn btn-secondary" onClick={() => repeat(order)}>
                    Repetir pedido
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </AccountLayout>
  );
}
