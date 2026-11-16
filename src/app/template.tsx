"use client";
import { usePathname } from "next/navigation";

// Se vuelve a montar en cada navegación: es la transición de entrada de página. Entre tamaños
// del mismo pack (/packs/cocina/small → medium) la página se actualiza sin remontarse, así que
// no hay salto: allí anima el selector, no la página entera.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const key = pathname.startsWith("/packs/") ? pathname.split("/").slice(0, 3).join("/") : pathname;
  return (
    <div className="page-transition" key={key}>
      {children}
    </div>
  );
}
