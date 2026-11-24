import { NextResponse } from "next/server";
import { dbAvailable, query } from "@/lib/server/db";

export const runtime = "nodejs";

/** Solo dice qué está agotado (inventariado en 0). Sin inventario no se afirma nada ni se publican cantidades. */
export async function GET() {
  const rows = dbAvailable() ? await query("select product_id from stock where on_hand <= 0").catch(() => []) : [];
  return NextResponse.json({ soldOut: rows.map((r) => r.product_id) }, { headers: { "cache-control": "private, max-age=30" } });
}
