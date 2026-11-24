import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/server/guard";
import { currentCustomer } from "@/lib/server/customers";
import * as sub from "@/lib/server/subscriptions";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!sub.subscriptionsEnabled()) return NextResponse.json({ error: "La suscripción no está disponible ahora mismo." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Petición no válida." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, any>;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const me = "Cliente";
  try {
    switch (action) {
      case "start":
        return NextResponse.json({ url: await sub.startSubscription(b, (await currentCustomer())?.id ?? null, origin) });
      case "portal":
        return NextResponse.json({ url: await sub.portalUrl(b.token, origin) });
      case "skip":
        await sub.skipNext(b.token, me);
        break;
      case "pause":
        await sub.pause(b.token, me);
        break;
      case "resume":
        await sub.resume(b.token, me);
        break;
      case "cancel":
        await sub.cancel(b.token, me);
        break;
      case "change":
        await sub.change(b.token, b, me);
        break;
      case "link": {
        const c = await currentCustomer();
        if (!c) return NextResponse.json({ error: "Entra en tu cuenta para continuar." }, { status: 401 });
        await sub.linkSubscription(b.token, c.id);
        break;
      }
      default:
        return NextResponse.json({ error: "No existe." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof sub.SubscriptionError) return NextResponse.json({ error: e.message, fields: e.fields }, { status: e.status });
    console.error("subscription", action, (e as Error).message);
    return NextResponse.json({ error: "No se ha podido completar. Vuelve a intentarlo." }, { status: 503 });
  }
}
