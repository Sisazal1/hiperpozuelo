import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBundleById, bundleDisplayName } from "@/lib/catalog/bundles";
import { lineQuantity, lineUnitPrice } from "@/lib/cart/totals";
import { getProductById } from "@/lib/catalog/products";
import { calculateOrderTotals, calculateDiscount, commerceConfig } from "@/config/commerce";

export const runtime = "nodejs";

// Cupón de bienvenida: se crea una vez y se reutiliza. El descuento se valida siempre
// en servidor a partir del código, nunca desde un importe enviado por el cliente.
let welcomeCoupon: Promise<string> | null = null;
function welcomeCouponId(stripe: Stripe): Promise<string> {
  const id = "hp-bienvenida10";
  if (!welcomeCoupon) {
    welcomeCoupon = (async () => {
      try {
        const coupon = await stripe.coupons.create({
          id,
          name: "Bienvenida 10%",
          percent_off: commerceConfig.welcomeDiscountRate * 100,
          duration: "once",
        });
        return coupon.id;
      } catch (error) {
        if ((error as { code?: string }).code === "resource_already_exists") return id;
        welcomeCoupon = null;
        throw error;
      }
    })();
  }
  return welcomeCoupon;
}

type Line = {
  type: "product" | "bundle" | "custom_bundle";
  lineId?: string;
  productId?: string;
  bundleId?: string;
  productIds?: string[];
  quantities?: Record<string, number>;
  quantity?: number;
  tier?: string;
};

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

function pricedLine(line: Line) {
  // Mismo cálculo que ve el cliente (src/lib/cart/totals.ts); el importe nunca viene del navegador.
  if (!line || typeof line !== "object") return null;
  const unit = lineUnitPrice(line);
  if (unit === null) return null;
  const quantity = Math.min(99, lineQuantity(line));
  if (line.type === "product") {
    const product = getProductById(line.productId!)!;
    return { id: product.id, name: product.name_es, amount: Math.round(unit * 100), quantity };
  }
  if (line.type === "bundle") {
    const bundle = getBundleById(line.bundleId!)!;
    return { id: bundle.id, name: bundleDisplayName(bundle), amount: Math.round(unit * 100), quantity };
  }
  return {
    id: `custom:${(line.productIds || []).join(",")}`,
    name: "Pack personalizado",
    amount: Math.round(unit * 100),
    quantity,
  };
}

export async function POST(req: Request) {
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  try {
    // Un POST con cuerpo vacío o mal formado debe dar 400, no tumbar el handler.
    const body = (await req.json().catch(() => null)) as {
      lines?: Line[];
      delivery?: "delivery" | "collect";
      discountCode?: string;
    } | null;
    if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const delivery = body.delivery === "collect" ? "collect" : "delivery";
    if (!Array.isArray(body.lines) || body.lines.length > 50)
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const lines = body.lines.map(pricedLine).filter(Boolean) as {
      id: string;
      name: string;
      amount: number;
      quantity: number;
    }[];
    if (!lines.length) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0) / 100;
    const discountAmount = calculateDiscount(subtotal, body.discountCode);
    const totals = calculateOrderTotals(subtotal, delivery, discountAmount);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const shippingAmount = Math.round(totals.shippingCost * 100);
    const couponId = discountAmount > 0 ? await welcomeCouponId(stripe) : null;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "es",
      phone_number_collection: { enabled: true },
      line_items: lines.map((line) => ({
        price_data: { currency: "eur", product_data: { name: line.name }, unit_amount: line.amount },
        quantity: line.quantity,
      })),
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      ...(delivery === "delivery"
        ? {
            shipping_address_collection: { allowed_countries: ["ES"] },
            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: { amount: shippingAmount, currency: "eur" },
                  display_name: "Entrega a domicilio",
                },
              },
            ],
          }
        : {}),
      success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=1`,
      metadata: {
        delivery,
        discount: String(Math.round(discountAmount * 100)),
        discount_code: couponId ? commerceConfig.welcomeDiscountCode : "",
        subtotal: String(Math.round(subtotal * 100)),
        order_items: JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity }))),
      },
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  }
}

export async function GET(req: Request) {
  const stripe = stripeClient();
  const id = new URL(req.url).searchParams.get("session_id");
  if (!stripe || !id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items"] });
    if (session.payment_status !== "paid") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      customer_email: session.customer_details?.email || session.customer_email,
      payment_method_types: session.payment_method_types,
      shipping: session.shipping_details,
      line_items:
        session.line_items?.data.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          amount_total: item.amount_total,
        })) || [],
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
