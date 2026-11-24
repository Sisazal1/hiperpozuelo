import { NextResponse } from "next/server";
import { dbAvailable, query } from "@/lib/server/db";
import { findForCustomer } from "@/lib/server/orders";
import { clientIp } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!dbAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { code?: unknown; contact?: unknown } | null;
  if (typeof b?.code !== "string" || typeof b?.contact !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  // Freno a quien pruebe códigos: 10 fallos por IP cada 15 minutos.
  const ip = `pedido:${await clientIp()}`;
  const [{ n }] = await query("select count(*)::int as n from login_attempts where ip=$1 and at > now() - interval '15 minutes'", [ip]);
  if (n >= 10) return NextResponse.json({ error: "blocked" }, { status: 429 });
  const token = await findForCustomer(b.code.slice(0, 20), b.contact.slice(0, 120));
  if (!token) {
    await query("insert into login_attempts (ip) values ($1)", [ip]);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ token });
}
