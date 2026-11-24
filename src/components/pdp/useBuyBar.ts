"use client";
import { useEffect, useState, type RefObject } from "react";

/** Escritorio: cuando todo el panel queda por encima. Móvil: siempre que el botón principal no se vea. */
export function useBuyBar(panel: RefObject<HTMLElement | null>, cta: RefObject<HTMLElement | null>) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 900px)");
    let io: IntersectionObserver | undefined;
    const setup = () => {
      io?.disconnect();
      const el = mq.matches ? cta.current : panel.current;
      if (!el) return;
      io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting));
      io.observe(el);
    };
    setup();
    mq.addEventListener("change", setup);
    return () => {
      io?.disconnect();
      mq.removeEventListener("change", setup);
    };
  }, [panel, cta]);
  return show;
}
