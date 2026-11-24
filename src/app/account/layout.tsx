import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tu cuenta", description: "Entra, crea una cuenta o sigue un pedido sin ella. Comprar no exige cuenta." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
