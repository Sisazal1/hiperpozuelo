import type { Metadata } from "next";

export const metadata: Metadata = { title: "Finalizar compra", description: "Pago seguro con Stripe. Envío a domicilio o recogida gratis en tienda." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
