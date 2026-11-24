import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import SubscribeForm from "@/components/subscription/SubscribeForm";
import { subscriptionsEnabled } from "@/lib/server/subscriptions";
import "@/components/subscription/subscription.css";
import "../../account/account.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmar suscripción", robots: { index: false, follow: false } };

export default function SubscribePage() {
  if (!subscriptionsEnabled()) redirect("/reposicion");
  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <span>
          <ShieldCheck size={16} aria-hidden="true" /> Pago seguro · sin necesidad de cuenta
        </span>
        <Link href="/reposicion">Volver a Reposición</Link>
      </header>
      <SubscribeForm />
    </div>
  );
}
