import Stripe from "stripe";
import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { flagByPaymentIntent, markPaidOnline, markSession, syncRefund } from "@/lib/server/orders";

export const runtime = "nodejs";

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? ""));

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = new Stripe(key).webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  // Solo el tipo y el id: en los registros del servidor no se escriben datos personales.
  console.log("stripe", event.type, event.id);
  if (!dbAvailable()) return NextResponse.json({ received: true });
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        if (s.payment_status === "paid") await markPaidOnline(s.id, idOf(s.payment_intent), s.amount_total ?? 0);
        break;
      }
      case "checkout.session.async_payment_failed":
        await markSession(event.data.object.id, "failed");
        break;
      case "checkout.session.expired":
        await markSession(event.data.object.id, "expired");
        break;
      case "charge.refunded":
        await syncRefund(idOf(event.data.object.payment_intent), event.data.object.amount_refunded);
        break;
      case "charge.dispute.created":
        await flagByPaymentIntent(idOf(event.data.object.payment_intent), `Disputa abierta: ${event.data.object.reason}. No enviar y responder en Stripe.`, "dispute");
        break;
      case "radar.early_fraud_warning.created":
        await flagByPaymentIntent(idOf(event.data.object.payment_intent), "Aviso temprano de fraude del banco. No enviar.", "review");
        break;
      case "review.opened":
        await flagByPaymentIntent(idOf(event.data.object.payment_intent), "Stripe Radar pide revisión manual.", "review");
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    // 500 para que Stripe reintente: las operaciones son idempotentes.
    console.error("webhook", event.type, (e as Error).message);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
