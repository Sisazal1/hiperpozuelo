import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { normalizePostalCode, paymentRules, zoneFor } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { dbAvailable, query } from "@/lib/server/db";
import {
  attachSession,
  createOrder,
  markPaidOnline,
  normalizePhone,
  openUnpaid,
  priceLines,
  shortages,
  totalsFor,
} from "@/lib/server/orders";
import { methodsFor, stripeClient, stripeIsTest, welcomeCouponId } from "@/lib/server/stripe";
import type { PaymentMode } from "@/lib/orders/status";

export const runtime = "nodejs";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const fail = (error: string, status = 400, extra: object = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  // Un POST con cuerpo vacío o mal formado debe dar 400, no tumbar el handler.
  const body = (await req.json().catch(() => null)) as Record<string, any> | null;
  if (!body || typeof body !== "object") return fail("invalid_request");
  const lines = priceLines(body.lines);
  if (!lines) return fail("invalid_request");

  const delivery = body.delivery === "collect" ? ("collect" as const) : ("delivery" as const);
  const mode: PaymentMode = body.payment === "later" ? (delivery === "collect" ? "pickup" : "cod") : "online";
  const customer = {
    name: text(body.customer?.name, 80),
    email: text(body.customer?.email, 120).toLowerCase(),
    phone: normalizePhone(body.customer?.phone),
  };
  const fields: Record<string, string> = {};
  if (customer.name.length < 2) fields.name = "Escribe tu nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) fields.email = "Revisa el email.";
  if (!/^[6-9]\d{8}$/.test(customer.phone)) fields.phone = "Escribe un teléfono español de 9 cifras.";
  const address = {
    line: text(body.address?.line, 120),
    postalCode: normalizePostalCode(body.address?.postalCode),
    city: "",
    note: text(body.address?.note, 160),
  };
  if (delivery === "delivery") {
    const zone = zoneFor(address.postalCode);
    if (!zone) fields.postalCode = "De momento repartimos en Pozuelo de Alarcón y Aravaca. Puedes recogerlo gratis en tienda.";
    else address.city = zone;
    if (address.line.length < 5) fields.line = "Escribe calle, número y piso.";
  }
  if (Object.keys(fields).length) return fail("invalid_fields", 422, { fields });

  const totals = totalsFor(lines, delivery, body.discountCode, mode);
  if (totals.total < 50) return fail("invalid_request");
  const db = dbAvailable();
  const requestKey = text(body.requestKey, 64) || null;

  try {
    if (db) {
      const missing = await shortages(lines);
      if (missing.length) return fail("out_of_stock", 409, { items: missing.map((m) => ({ name: m.name, available: m.available })) });
    }

    // ---------- Pago al recoger / contra reembolso ----------
    if (mode !== "online") {
      if (!db) return fail("later_unavailable", 503);
      if (mode === "cod" && totals.total > paymentRules.codMax * 100) return fail("cod_limit", 409, { max: paymentRules.codMax });
      if (requestKey) {
        const [dup] = await query("select token from orders where request_key=$1", [requestKey]);
        if (dup) return NextResponse.json({ order: dup.token });
      }
      if ((await openUnpaid(customer.phone)) >= paymentRules.maxOpenUnpaid) return fail("too_many_open", 429);
      const order = await createOrder({
        channel: "web", mode, delivery, lines, totals, customer,
        address: delivery === "delivery" ? address : undefined,
        requestKey, actor: "Cliente", test: siteConfig.prelaunch,
      });
      return NextResponse.json({ order: order.token });
    }

    // ---------- Pago online con Stripe ----------
    const stripe = stripeClient();
    if (!stripe) return fail("payment_unavailable", 503);
    const order = db
      ? await createOrder({
          channel: "web", mode, delivery, lines, totals, customer,
          address: delivery === "delivery" ? address : undefined,
          requestKey: null, actor: "Cliente", test: stripeIsTest(),
        })
      : null;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const couponId = totals.discount > 0 ? await welcomeCouponId(stripe) : null;
    const methods = await methodsFor(stripe, totals.total);
    const meta = {
      order_code: order?.code ?? "",
      delivery,
      discount_code: totals.discountCode ?? "",
      subtotal: String(totals.subtotal),
      order_items: JSON.stringify(lines.map((l) => [l.ref, l.quantity])).slice(0, 490),
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "es",
        customer_email: customer.email,
        payment_method_types: methods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        payment_method_options: {
          card: { request_three_d_secure: totals.total >= paymentRules.force3dsFrom * 100 ? "any" : "automatic" },
        },
        line_items: lines.map((l) => ({
          price_data: { currency: "eur", product_data: { name: l.name }, unit_amount: l.unit },
          quantity: l.quantity,
        })),
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        ...(delivery === "delivery"
          ? {
              shipping_options: [
                {
                  shipping_rate_data: {
                    type: "fixed_amount" as const,
                    fixed_amount: { amount: totals.shipping, currency: "eur" },
                    display_name: `Entrega a domicilio · ${address.city}`,
                  },
                },
              ],
            }
          : {}),
        payment_intent_data: {
          description: order ? `Pedido ${order.code}` : "Pedido Hiper Pozuelo",
          metadata: meta,
          ...(delivery === "delivery"
            ? {
                shipping: {
                  name: customer.name,
                  phone: customer.phone,
                  address: { line1: address.line, postal_code: address.postalCode, city: address.city, country: "ES" },
                },
              }
            : {}),
        },
        custom_text: { submit: { message: "Al pagar aceptas las condiciones de compra de Hiper Pozuelo." } },
        // El enlace caduca a los 45 min: así una cesta abandonada se contabiliza el mismo día.
        expires_at: Math.floor(Date.now() / 1000) + 45 * 60,
        success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        metadata: meta,
      },
      requestKey ? { idempotencyKey: `hp-${requestKey}-${totals.total}-${order?.id ?? ""}` } : undefined,
    );
    if (order) await attachSession(order.id, session.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout", (e as Error).message);
    return fail("payment_unavailable", 503);
  }
}

/** Vuelta de Stripe: confirma el pago y enlaza con el seguimiento. Los datos personales solo se devuelven recién comprado. */
export async function GET(req: Request) {
  const stripe = stripeClient();
  const id = new URL(req.url).searchParams.get("session_id");
  if (!stripe || !id) return fail("not_found", 404);
  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items", "payment_intent.latest_charge"] });
    if (session.payment_status !== "paid") return fail("not_found", 404);
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const charge = pi?.latest_charge as Stripe.Charge | null | undefined;
    let token: string | null = null;
    let code: string | null = null;
    if (dbAvailable() && pi) {
      const order = await markPaidOnline(session.id, pi.id, session.amount_total ?? 0);
      token = order?.token ?? null;
      code = order?.code ?? null;
    }
    const recent = Date.now() / 1000 - session.created < 3 * 3600;
    const ship = pi?.shipping?.address;
    return NextResponse.json({
      id: session.id,
      code,
      token,
      status: session.status,
      payment_status: session.payment_status,
      payment_reference: pi?.id ?? null,
      amount_total: session.amount_total,
      customer_email: recent ? session.customer_details?.email || session.customer_email : null,
      payment_method: charge?.payment_method_details?.type ?? "card",
      wallet: charge?.payment_method_details?.card?.wallet?.type ?? null,
      three_d_secure: charge?.payment_method_details?.card?.three_d_secure?.result ?? null,
      delivery: session.metadata?.delivery ?? (ship ? "delivery" : "collect"),
      shipping: recent && ship ? { line1: ship.line1, postal_code: ship.postal_code, city: ship.city } : null,
      line_items:
        session.line_items?.data.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          amount_total: item.amount_total,
        })) || [],
    });
  } catch {
    return fail("not_found", 404);
  }
}
