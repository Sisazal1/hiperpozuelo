"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, Mail, Package, ShieldCheck } from "lucide-react";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { readLocalOrders, type LocalOrder } from "@/lib/orders";

// No hay cuentas de cliente: la compra es como invitado y Stripe envía el recibo por email.
// Antes había un login "demo" que pedía contraseña sin backend; se ha retirado por honestidad.
export default function AccountPage() {
  const [orders, setOrders] = useState<LocalOrder[] | null>(null);
  useEffect(() => setOrders(readLocalOrders()), []);
  return (
    <div className="account-page">
      <div className="account-container">
        <header className="account-hero" data-reveal>
          <span className="eyebrow">Tu cuenta</span>
          <h1>Aquí no hace falta contraseña.</h1>
          <p>Compras como invitado: sin registrarte y con pago seguro en Stripe. El recibo te llega por email al pagar.</p>
        </header>
        <div className="account-cards" data-reveal-stagger>
          <Link href="/favorites" className="account-card" data-reveal>
            <Heart aria-hidden="true" />
            <strong>Favoritos</strong>
            <span>Lo que has guardado en este dispositivo.</span>
          </Link>
          <div className="account-card" data-reveal>
            <Mail aria-hidden="true" />
            <strong>Recibos</strong>
            <span>Llegan al email que pongas al pagar.</span>
          </div>
          <div className="account-card" data-reveal>
            <ShieldCheck aria-hidden="true" />
            <strong>Pago seguro</strong>
            <span>Tus datos de tarjeta los gestiona Stripe, nunca nosotros.</span>
          </div>
        </div>
        <section className="account-orders" aria-labelledby="orders-title" data-reveal>
          <h2 id="orders-title">
            <Package size={20} aria-hidden="true" /> Pedidos en este dispositivo
          </h2>
          {orders === null ? (
            <div className="skeleton-block" style={{ height: 96 }} aria-hidden="true" />
          ) : orders.length ? (
            <ul className="local-orders">
              {orders.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>{new Date(o.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</strong>
                    <small>
                      {o.items} {o.items === 1 ? "artículo" : "artículos"} · {o.delivery === "collect" ? "Recogida" : "Envío"} · ref. {o.id.slice(-8)}
                    </small>
                  </span>
                  <b>{formatEuroPrice(o.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="account-empty">
              Aún no has hecho pedidos desde este dispositivo.{" "}
              <Link href="/packs">
                Empieza por un pack <ArrowRight size={14} />
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
