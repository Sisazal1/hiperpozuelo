import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBundleById, calculateBundleTotal } from "@/lib/catalog/bundles";
import { getProductById } from "@/lib/catalog/products";
import { commerceConfig } from "@/config/commerce";

export const runtime = "nodejs";

type Line = { type: "product" | "bundle" | "custom_bundle"; productId?: string; bundleId?: string; productIds?: string[]; quantities?: Record<string, number>; quantity?: number; tier?: string };

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

function pricedLine(line: Line) {
  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
  if (line.type === "product") {
    const product = line.productId ? getProductById(line.productId) : undefined;
    return product ? { id: product.id, name: product.name_es, amount: Math.round(product.proposed_price_eur * 100), quantity } : null;
  }
  if (line.type === "bundle") {
    const bundle = line.bundleId ? getBundleById(line.bundleId) : undefined;
    return bundle ? { id: bundle.id, name: bundle.name_es, amount: Math.round(calculateBundleTotal(bundle) * 100), quantity } : null;
  }
  const ids = line.productIds || [];
  const quantities = line.quantities || {};
  const products = ids.map((id) => getProductById(id)).filter(Boolean);
  return products.length === ids.length && ids.length > 0 ? {
    id: `custom:${ids.join(",")}`, name: "Pack personalizado", amount: Math.round(products.reduce((sum, product) => sum + product!.proposed_price_eur * (quantities[product!.id] || 0), 0) * 100), quantity,
  } : null;
}

export async function POST(req: Request) {
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  try {
    const body = await req.json() as { lines?: Line[]; delivery?: "delivery" | "collect"; customer?: { email?: string }; address?: unknown };
    const delivery = body.delivery === "collect" ? "collect" : "delivery";
    const lines = (body.lines || []).map(pricedLine).filter(Boolean) as { id: string; name: string; amount: number; quantity: number }[];
    if (!lines.length) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const shippingAmount = delivery === "collect" || subtotal >= commerceConfig.freeShippingThreshold * 100 ? 0 : Math.round(commerceConfig.standardShippingFee * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment", customer_email: body.customer?.email,
      line_items: lines.map((line) => ({ price_data: { currency: "eur", product_data: { name: line.name }, unit_amount: line.amount }, quantity: line.quantity })),
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: shippingAmount, currency: "eur" }, display_name: delivery === "collect" ? "Recogida en tienda" : "Entrega a domicilio" } }],
      success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/checkout?canceled=1`,
      metadata: { customer_email: body.customer?.email || "", delivery, order_items: JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity }))) },
    });
    return NextResponse.json({ url: session.url });
  } catch { return NextResponse.json({ error: "payment_unavailable" }, { status: 503 }); }
}

export async function GET(req: Request) {
  const stripe = stripeClient();
  const id = new URL(req.url).searchParams.get("session_id");
  if (!stripe || !id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items"] });
    if (session.payment_status !== "paid") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ status: session.status, payment_status: session.payment_status, amount_total: session.amount_total, customer_email: session.customer_details?.email || session.customer_email, line_items: session.line_items?.data.map((item) => ({ description: item.description, quantity: item.quantity, amount_total: item.amount_total })) || [] });
  } catch { return NextResponse.json({ error: "not_found" }, { status: 404 }); }
}
