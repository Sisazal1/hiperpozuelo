import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tienda", description: "Todo el catálogo de Hiper Pozuelo: cocina, baño, limpieza, orden, estudio y más." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
