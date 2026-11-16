import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contacto", description: "Cómo contactar con Hiper Pozuelo." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
