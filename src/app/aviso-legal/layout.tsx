import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso legal", description: "Información legal de Hiper Pozuelo S.L." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
