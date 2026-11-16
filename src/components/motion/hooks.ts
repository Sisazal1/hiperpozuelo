"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Interpola un número (precios, totales) con ease-out para que el cambio se lea, no salte. */
export function useTweenedNumber(value: number, duration = 450) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return display;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Trampa de foco para diálogos modales: Tab/Shift+Tab ciclan dentro y Escape cierra. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escape = useRef(onEscape);
  escape.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (!root) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        escape.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = root.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, ref]);
}

/** Estado "añadido" temporal para botones de compra (morph a ✓ durante ~1,4 s). */
export function useAddedFeedback(ms = 1400) {
  const [added, setAdded] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return [
    added,
    () => {
      setAdded(true);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setAdded(false), ms);
    },
  ] as const;
}

/** true cuando el CTA principal no está a la vista (por arriba o aún por debajo): barra de compra fija. */
export function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return past;
}
