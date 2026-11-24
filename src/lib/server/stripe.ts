import "server-only";
import Stripe from "stripe";
import { pointsConfig } from "@/config/points";
import { commerceConfig, paymentRules } from "@/config/commerce";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}
export const stripeIsTest = () => !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live");

// Lista blanca para un bazar de Pozuelo. Sin ella Stripe enseñaba Bancontact, EPS o MB WAY, que aquí
// no usa nadie. Bizum y PayPal entran solos el día que se activen en el panel de Stripe.
const ALLOWED = ["card", "bizum", "paypal", "klarna", "link"] as const;
export type OnlineMethod = (typeof ALLOWED)[number];

let cache: { at: number; list: OnlineMethod[]; wallets: string[] } | null = null;

export async function enabledMethods(stripe: Stripe) {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache;
  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 10 });
    const c = (configs.data.find((x) => x.is_default) ?? configs.data[0]) as unknown as Record<
      string,
      { available?: boolean; display_preference?: { value: string } } | undefined
    >;
    const on = (k: string) => Boolean(c?.[k]?.available && c[k]?.display_preference?.value === "on");
    const list = ALLOWED.filter((k) => k === "card" || on(k));
    cache = { at: Date.now(), list, wallets: ["apple_pay", "google_pay"].filter(on) };
  } catch {
    cache = { at: Date.now() - 9 * 60_000, list: ["card"], wallets: [] };
  }
  return cache;
}

export async function methodsFor(stripe: Stripe, totalCents: number) {
  const { list } = await enabledMethods(stripe);
  return list.filter((m) => m !== "klarna" || totalCents >= paymentRules.klarnaMin * 100);
}

// Canje de puntos: cupón de importe fijo, uno por importe y reutilizable. El canje se valida antes en servidor.
export async function pointsCouponId(stripe: Stripe, cents: number): Promise<string> {
  const id = `hp-puntos-${cents}`;
  try {
    return (await stripe.coupons.create({ id, name: pointsConfig.name, amount_off: cents, currency: "eur", duration: "once" })).id;
  } catch (error) {
    if ((error as { code?: string }).code === "resource_already_exists") return id;
    throw error;
  }
}

// Cupón de bienvenida: se crea una vez y se reutiliza. El descuento se valida siempre
// en servidor a partir del código, nunca desde un importe enviado por el cliente.
let welcomeCoupon: Promise<string> | null = null;
export function welcomeCouponId(stripe: Stripe): Promise<string> {
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
