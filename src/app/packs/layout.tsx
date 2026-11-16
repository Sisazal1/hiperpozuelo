import type { Metadata } from "next";

export const metadata: Metadata = { title: "Packs para equipar tu casa", description: "Packs de cocina, baño, limpieza y estudio en tres tamaños. Precio claro, sin sorpresas." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
