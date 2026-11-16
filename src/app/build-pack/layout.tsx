import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crea tu pack", description: "Elige productos y cantidades y monta tu propio pack para casa." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
