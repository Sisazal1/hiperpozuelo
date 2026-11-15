import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  try {
    const event = new Stripe(key).webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") || "", secret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Stripe checkout.session.completed", session.id, session.customer_details?.email || session.customer_email || "");
    }
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }
}
