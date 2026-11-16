import type { Metadata } from "next";

export const metadata: Metadata = { title: "Favoritos", description: "Los productos que has guardado." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
