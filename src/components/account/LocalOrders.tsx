"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { readLocalOrders, type LocalOrder } from "@/lib/orders";

/** Pedidos hechos como invitado desde este navegador. */
export default function LocalOrders() {
  const [orders, setOrders] = useState<LocalOrder[] | null>(null);
  useEffect(() => setOrders(readLocalOrders()), []);
  if (orders === null) return <div className="skeleton-block" style={{ height: 96 }} aria-hidden="true" />;
  if (!orders.length)
    return (
      <p className="account-empty">
        Aún no has hecho pedidos desde este dispositivo.{" "}
        <Link href="/packs">
          Empieza por un pack <ArrowRight size={14} />
        </Link>
      </p>
    );
  return (
    <ul className="local-orders">
      {orders.map((o) => (
        <li key={o.id}>
          <span>
            <strong>{new Date(o.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</strong>
            <small>
              {o.items} {o.items === 1 ? "artículo" : "artículos"} · {o.delivery === "collect" ? "Recogida" : "Envío"} · {o.code ?? `ref. ${o.id.slice(-8)}`}
            </small>
          </span>
          <b>{formatEuroPrice(o.amount)}</b>
          {o.token && (
            <Link href={`/pedido/${o.token}`} className="btn btn-secondary">
              Ver estado
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
