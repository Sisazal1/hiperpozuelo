"use client";
import { useEffect, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
import { useStore } from "@/state/store";

const CLOSED_KEY = "hp-welcome-closed-at";
const REDEEMED_KEY = "hp-welcome-redeemed";

export default function WelcomeScratchCard() {
  const { applyDiscountCode } = useStore();
  const [open, setOpen] = useState(false); const [revealed, setRevealed] = useState(false); const [used, setUsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null); const closeRef = useRef<HTMLButtonElement>(null); const scratching = useRef(false); const strokes = useRef(0);
  useEffect(() => { if (["/cart", "/checkout"].includes(location.pathname) || localStorage.getItem(REDEEMED_KEY) === "1") return; const closed = Number(localStorage.getItem(CLOSED_KEY) || 0); if (closed && Date.now() - closed < 30 * 24 * 60 * 60 * 1000) return; let shown = false; const show = () => { if (!shown) { shown = true; setOpen(true); } }; const timer = setTimeout(show, 12000); const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; if (max > 0 && scrollY / max >= .4) show(); }; addEventListener("scroll", onScroll, { passive: true }); return () => { clearTimeout(timer); removeEventListener("scroll", onScroll); }; }, []);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(); addEventListener("keydown", onKey); return () => removeEventListener("keydown", onKey); }, [open]);
  useEffect(() => { if (!open || revealed || !canvasRef.current) return; const canvas = canvasRef.current; const dpr = devicePixelRatio || 1; canvas.width = 320 * dpr; canvas.height = 150 * dpr; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(dpr, dpr); ctx.fillStyle = "#d9c7aa"; ctx.fillRect(0, 0, 320, 150); ctx.fillStyle = "#5b4b37"; ctx.font = "600 14px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Rasca aquí", 160, 78); }, [open, revealed]);
  function close() { localStorage.setItem(CLOSED_KEY, String(Date.now())); setOpen(false); }
  function reveal() { setRevealed(true); }
  function scratch(e: React.PointerEvent<HTMLCanvasElement>) { if (!scratching.current || revealed) return; const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return; const r = c.getBoundingClientRect(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc((e.clientX-r.left)*320/r.width, (e.clientY-r.top)*150/r.height, 20, 0, Math.PI*2); ctx.fill(); strokes.current += 1; if (strokes.current > 24) reveal(); }
  function redeem() { applyDiscountCode(commerceConfig.welcomeDiscountCode); localStorage.setItem(REDEEMED_KEY, "1"); setUsed(true); setTimeout(close, 700); }
  if (!open) return null;
  return <div className="welcome-scratch-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="welcome-scratch" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><button ref={closeRef} className="icon-button" onClick={close} aria-label="Cerrar"><X size={20}/></button><Gift size={28} aria-hidden="true"/><h2 id="welcome-title">Rasca y descubre tu regalo de bienvenida</h2><p>Tu primera compra tiene un 10% real de descuento.</p><div className="scratch-stage"><strong className={revealed ? "is-revealed" : ""}>10% DE DESCUENTO · {commerceConfig.welcomeDiscountCode}</strong><canvas ref={canvasRef} onPointerDown={(e) => { scratching.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e); }} onPointerMove={scratch} onPointerUp={() => { scratching.current = false; }} aria-label="Área para rascar" /></div><button className="btn btn-secondary" onClick={reveal} disabled={revealed}>Revelar mi regalo</button>{revealed && <button className="btn btn-primary" onClick={redeem} disabled={used}>{used ? "Descuento guardado" : "Usar mi 10%"}</button>}<p className="welcome-note">No acumulable. Aplicado sobre productos, no sobre el envío.</p></section></div>;
}
