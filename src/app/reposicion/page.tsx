import type { Metadata } from "next";
import Refill from "@/components/subscription/Refill";
import { FactsBand, PdpFaq } from "@/components/pdp/parts";
import "@/components/subscription/subscription.css";

export const metadata: Metadata = {
  title: "Reposición",
  description: "Esponjas, paños, bolsas de basura y recambio de fregona: compra única o suscripción, con recogida gratis en Pozuelo de Alarcón.",
  alternates: { canonical: "/reposicion" },
};

export default function RefillPage() {
  return (
    <>
      <Refill />
      <FactsBand />
      <PdpFaq />
    </>
  );
}
