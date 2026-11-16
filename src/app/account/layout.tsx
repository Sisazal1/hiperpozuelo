import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tu cuenta", description: "Compra sin cuenta: tus favoritos y los pedidos hechos desde este dispositivo." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
