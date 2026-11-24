"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barra fina de progreso al navegar (patrón Apple/Linear): arranca al pulsar un enlace interno,
 * avanza de forma asintótica mientras carga la ruta y se completa al cambiar el pathname.
 * Escucha también el inicio de ScrollReveal para volver a escanear la página nueva.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Solo se completa al cambiar el pathname: si solo cambian los filtros, no arranca.
      if (url.pathname === location.pathname) return;
      window.clearTimeout(timer.current);
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = window.setTimeout(() => setState("idle"), 450);
    return () => window.clearTimeout(timer.current);
  }, [pathname]);

  return <div className="route-progress" data-state={state} aria-hidden="true" />;
}
