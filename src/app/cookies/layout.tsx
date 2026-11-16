import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies", description: "Qué almacenamos en tu navegador y por qué." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
