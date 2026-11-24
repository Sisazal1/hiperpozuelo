import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { countFunnel, FUNNEL } from "@/lib/server/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text().catch(() => "");
  const name = /"name":"(\w{1,20})"/.exec(body)?.[1];
  const origin = req.headers.get("origin");
  const sameSite = !origin || new URL(origin).host === req.headers.get("host");
  const bot = /bot|crawl|spider|lighthouse|preview/i.test(req.headers.get("user-agent") || "");
  if (name && sameSite && !bot && dbAvailable() && (FUNNEL as readonly string[]).includes(name)) await countFunnel(name).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
