import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preguntas frecuentes", description: "Envíos, recogida, pagos y devoluciones en Hiper Pozuelo." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
