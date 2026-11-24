import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ordersEnabled } from "@/config/commerce";

export const metadata: Metadata = { title: "Seguir mi pedido", description: "Consulta el estado de tu pedido en Hiper Pozuelo." };

export default function Layout({ children }: { children: React.ReactNode }) {
  if (!ordersEnabled) notFound();
  return children;
}
