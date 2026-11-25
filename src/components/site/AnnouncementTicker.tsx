"use client";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
export default function AnnouncementTicker() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [index, setIndex] = useState(0);
  const messages = useMemo(
    () => [
      `Envío gratis desde ${commerceConfig.freeShippingThreshold} €`,
      `Recogida en tienda gratis`,
      `Compra sin cuenta`,
      ...(commerceConfig.welcomeDiscountRate > 0 ? ["−10% en tu primera compra"] : []),
    ],
    [],
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(m.matches);
    u();
    m.addEventListener("change", u);
    return () => m.removeEventListener("change", u);
  }, []);
  useEffect(() => {
    if (!reduced || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(t);
  }, [reduced, paused, messages.length]);
  const item = (m: string, i: number, d = false) => (
    <span className="announcement-item" key={`${d ? "duplicate" : "message"}-${i}`} aria-hidden={d}>
      {m}
      <i aria-hidden="true">·</i>
    </span>
  );
  return (
    <section
      className={`announcement-ticker ${paused ? "is-paused" : ""} ${reduced ? "is-reduced" : ""}`}
      aria-label="Anuncios de Hiper Pozuelo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="announcement-viewport">
        {reduced ? (
          <div className="announcement-reduced-message" key={messages[index]}>
            {messages[index]}
          </div>
        ) : (
          <div className="announcement-track">
            {messages.map((m, i) => item(m, i))}
            {messages.map((m, i) => item(m, i, true))}
          </div>
        )}
      </div>
      <button
        className="announcement-pause"
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-pressed={paused}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
        <span>{paused ? "Reanudar" : "Pausar"}</span>
      </button>
    </section>
  );
}
