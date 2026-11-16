import type { Metadata } from "next";

export const metadata: Metadata = { title: "Envíos y devoluciones", description: "Costes de envío, recogida en tienda y derecho de desistimiento." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
