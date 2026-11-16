"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Un solo IntersectionObserver para toda la web. Cualquier elemento (también en componentes de
 * servidor) entra con `data-reveal`; sus hijos se escalonan si el padre lleva
 * `data-reveal-stagger`. Variantes: data-reveal="up" (por defecto) | "fade" | "scale" | "left".
 * Sin JS (no hay clase .js en <html>) todo se ve desde el principio.
 */
export default function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.revealed = "true";
          io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal-stagger]").forEach((parent) => {
        Array.from(parent.children).forEach((child, i) => (child as HTMLElement).style.setProperty("--i", String(Math.min(i, 12))));
      });
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => io.observe(el));
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.getElementById("main-content") || document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
