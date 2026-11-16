import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tu cesta", description: "Revisa tu cesta, aplica tu código y elige envío o recogida gratis." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
