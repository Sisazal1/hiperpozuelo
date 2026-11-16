"use client";
import { useEffect, useRef } from "react";

/** Parallax suave del fondo del hero (solo transform, rAF, se desactiva con reduced motion). */
export default function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        if (ref.current) ref.current.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0002})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="hp-hero-media" ref={ref} aria-hidden="true">
      {children}
    </div>
  );
}
