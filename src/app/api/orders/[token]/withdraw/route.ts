import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { OrderError, withdraw } from "@/lib/server/orders";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!dbAvailable()) return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { contact?: unknown } | null;
  try {
    const o = await withdraw((await params).token, typeof b?.contact === "string" ? b.contact : "");
    return NextResponse.json({ ref: o.withdrawal_ref, at: o.withdrawal_at });
  } catch (e) {
    const known = e instanceof OrderError;
    return NextResponse.json({ error: known ? e.message : "No se ha podido registrar." }, { status: known ? 409 : 500 });
  }
}
