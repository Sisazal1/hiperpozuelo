import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad", description: "Política de privacidad de Hiper Pozuelo." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
