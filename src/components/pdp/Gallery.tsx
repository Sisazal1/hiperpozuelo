"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Principal deslizable + una ancha + dos en paralelo. Solo pinta las imágenes que existen. */
export default function Gallery({ images, alt, tile }: { images: string[]; alt: string; tile: React.ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [i, setI] = useState(0);
  if (!images.length) return <div className="pdp-gallery-tile">{tile}</div>;
  const many = images.length > 1;
  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, n));
    el.scrollTo({ left: el.clientWidth * next, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className="pdp-gallery">
      <div className="pdp-stage" role={many ? "group" : undefined} aria-roledescription={many ? "carrusel" : undefined} aria-label={many ? "Imágenes" : undefined}>
        <ul
          ref={track}
          className="pdp-track"
          tabIndex={many ? 0 : undefined}
          aria-label={many ? `Imágenes de ${alt}` : undefined}
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        >
          {images.map((src, n) => (
            <li key={src}>
              <Image src={src} alt={n ? "" : alt} fill sizes="(max-width: 900px) 100vw, 60vw" priority={n === 0} />
            </li>
          ))}
        </ul>
        {many && (
          <>
            <button type="button" className="pdp-arrow is-prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Imagen anterior">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="pdp-arrow is-next" onClick={() => go(i + 1)} disabled={i === images.length - 1} aria-label="Imagen siguiente">
              <ChevronRight size={20} />
            </button>
            <p className="pdp-dots">
              <span className="sr-only" aria-live="polite">
                Imagen {i + 1} de {images.length}
              </span>
              {images.map((src, n) => (
                <span key={src} aria-hidden="true" data-on={n === i || undefined} />
              ))}
            </p>
          </>
        )}
      </div>
      {many && (
        <div className="pdp-extra" aria-hidden="true">
          {images.slice(1, 4).map((src) => (
            <span key={src}>
              <Image src={src} alt="" fill sizes="(max-width: 900px) 1px, 60vw" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
