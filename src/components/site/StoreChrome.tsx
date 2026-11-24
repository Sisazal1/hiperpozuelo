"use client";
import { usePathname } from "next/navigation";

/** Cabecera, pie y avisos de la tienda: no pintan nada en el backoffice. */
export default function StoreChrome({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/backoffice") ? null : <>{children}</>;
}
