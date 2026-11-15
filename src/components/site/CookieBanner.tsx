"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "hp-cookie-consent";

/**
 * The site only uses technical storage (cart, favourites, checkout draft).
 * It sets no analytics or advertising cookies, and the banner says exactly that.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { setVisible(!localStorage.getItem(KEY)); } catch { setVisible(false); }
  }, []);

  if (!visible) return null;
  return (
    <section className="cookie" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos almacenamiento técnico imprescindible para recordar tu cesta y tus favoritos. No usamos cookies de análisis ni de publicidad.{" "}
        <Link href="/cookies">Más información</Link>
      </p>
      <button
        type="button"
        className="btn btn-dark btn-sm"
        onClick={() => { try { localStorage.setItem(KEY, "accepted"); } catch { /* ignore */ } setVisible(false); }}
      >
        Entendido
      </button>
    </section>
  );
}
