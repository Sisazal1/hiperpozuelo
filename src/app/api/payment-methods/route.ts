import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { enabledMethods, stripeClient } from "@/lib/server/stripe";

export const runtime = "nodejs";

/** La tienda solo enseña los métodos que el TPV acepta de verdad en este momento. */
export async function GET() {
  const stripe = stripeClient();
  const m = stripe ? await enabledMethods(stripe) : { list: [], wallets: [] };
  return NextResponse.json({ online: m.list, wallets: m.wallets, later: dbAvailable() }, { headers: { "cache-control": "private, max-age=60" } });
}
