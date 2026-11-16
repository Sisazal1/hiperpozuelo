"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/components/motion/hooks";
import { Check, Copy, Gift, Sparkles, X } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
import { useStore } from "@/state/store";

const CLOSED_KEY = "hp-welcome-closed-at";
const REDEEMED_KEY = "hp-welcome-redeemed";
const HIDE_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const REVEAL_AT = 0.42; // proporción rascada que descubre el premio

export default function WelcomeScratch() {
  const { applyDiscountCode, discountCode } = useStore();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [foil, setFoil] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scratching = useRef(false);
  const points = useRef(0);
  const lastFocus = useRef<Element | null>(null);
  const trapRef = useRef<HTMLElement>(null);

  // Aparece tras 9 s o al 35 % de scroll, una vez cada 30 días y nunca en cesta/checkout.
  useEffect(() => {
    if (discountCode === commerceConfig.welcomeDiscountCode) return;
    if (["/cart", "/checkout"].some((p) => location.pathname.startsWith(p))) return;
    if (localStorage.getItem(REDEEMED_KEY) === "1") return;
    const closedAt = Number(localStorage.getItem(CLOSED_KEY) || 0);
    if (closedAt && Date.now() - closedAt < HIDE_FOR_MS) return;
    // No intrusivo: tras 9 s o cuando el visitante ha recorrido un 35 % de la página.
    let done = false;
    const show = () => {
      if (done || document.documentElement.dataset.drawer) return;
      done = true;
      lastFocus.current = document.activeElement;
      setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max > 0 && scrollY / max > 0.35) show();
    };
    const timer = setTimeout(show, 9000);
    addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
    };
    return cleanup;
  }, [discountCode]);

  const dismiss = useCallback(() => {
    localStorage.setItem(CLOSED_KEY, String(Date.now()));
    setOpen(false);
    if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismiss]);

  // Capa de rascado: se pinta al abrir y cuando cambia el tamaño de la tarjeta.
  useEffect(() => {
    if (!open || revealed) return;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;
    const paint = () => {
      const rect = card.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#e7dac4");
      gradient.addColorStop(0.45, "#d9c7a9");
      gradient.addColorStop(1, "#c8b391");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#8a7355";
      ctx.lineWidth = 1;
      for (let x = -rect.height; x < rect.width; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + rect.height, rect.height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#6b5a42";
      ctx.textAlign = "center";
      ctx.font = "700 13px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("RASCA AQUÍ", rect.width / 2, rect.height / 2 - 4);
      ctx.font = "400 11px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.globalAlpha = 0.75;
      ctx.fillText("y descubre tu regalo", rect.width / 2, rect.height / 2 + 14);
      ctx.globalAlpha = 1;
    };
    paint();
    setFoil(canvas.toDataURL());
    const observer = new ResizeObserver(() => {
      paint();
      setFoil(canvas.toDataURL());
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [open, revealed]);

  function measureScratched() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) {
      total += 1;
      if (data[i] < 32) clear += 1;
    }
    return total ? clear / total : 0;
  }

  function scratchAt(clientX: number, clientY: number) {
    if (!scratching.current || revealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = (cardRef.current ?? canvas).getBoundingClientRect();
    if (!rect.width) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    points.current += 1;
    if (points.current % 6 === 0) {
      const ratio = measureScratched();
      setProgress(Math.min(1, ratio / REVEAL_AT));
      if (ratio >= REVEAL_AT) setRevealed(true);
      else setFoil(canvas.toDataURL());
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(commerceConfig.welcomeDiscountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  function apply() {
    applyDiscountCode(commerceConfig.welcomeDiscountCode);
    localStorage.setItem(REDEEMED_KEY, "1");
    setOpen(false);
  }

  useFocusTrap(trapRef, open);
  if (!open) return null;

  return (
    <div className="welcome-backdrop" onMouseDown={(e) => e.target === e.currentTarget && dismiss()}>
      <section
        ref={trapRef}
        className={`welcome-card${revealed ? " is-revealed" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-desc"
      >
        <button ref={closeRef} className="welcome-close" onClick={dismiss} aria-label="Cerrar">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="welcome-head">
          <span className="welcome-icon" aria-hidden="true">
            <Gift size={20} />
          </span>
          <p className="welcome-eyebrow">Regalo de bienvenida</p>
        </div>
        <h2 id="welcome-title">Rasca y descubre tu 10%</h2>
        <p id="welcome-desc">
          Un descuento real en tu primera compra, sobre los productos y no sobre el envío.
        </p>

        <div className="scratch-stage" ref={cardRef}>
          <div className="scratch-prize" aria-hidden={!revealed}>
            <Sparkles size={18} aria-hidden="true" />
            <strong>10% de descuento</strong>
            <span>{commerceConfig.welcomeDiscountCode}</span>
          </div>
          {!revealed && (
            <>
              <canvas ref={canvasRef} className="scratch-canvas" aria-hidden="true" />
              <div
                className="scratch-foil"
                role="img"
                aria-label="Zona para rascar y descubrir el descuento"
                style={foil ? { backgroundImage: `url(${foil})` } : undefined}
                onPointerDown={(e) => {
                  scratching.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scratchAt(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => scratchAt(e.clientX, e.clientY)}
                onPointerUp={() => {
                  scratching.current = false;
                }}
                onPointerLeave={() => {
                  scratching.current = false;
                }}
              />
            </>
          )}
        </div>

        {!revealed ? (
          <div className="scratch-controls">
            <div className="scratch-meter" aria-hidden="true">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <button type="button" className="welcome-secondary" onClick={() => setRevealed(true)}>
              Revelar sin rascar
            </button>
          </div>
        ) : (
          <>
            <div className="welcome-actions">
              <button type="button" className="welcome-primary" onClick={apply}>
                Aplicar a mi cesta
              </button>
              <button
                type="button"
                className="welcome-secondary"
                onClick={copy}
                aria-label="Copiar el código de descuento"
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button type="button" className="welcome-dismiss-link" onClick={dismiss}>
              Ahora no, gracias
            </button>
          </>
        )}
        <small className="welcome-note">
          Válido en tu primera compra. No acumulable con otras promociones.
        </small>
      </section>
    </div>
  );
}
