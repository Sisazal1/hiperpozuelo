import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/server/guard";
import { AccountError, currentCustomer, requireCustomer } from "@/lib/server/customers";
import { createReview, deleteReview, editReview, ownState, reviewsEnabled, subjectPath } from "@/lib/server/reviews";

export const runtime = "nodejs";
const noStore = { headers: { "cache-control": "no-store" } };

/** Lo propio: si puede opinar y sus reseñas, también las de pedidos de prueba, que solo ve su autor. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const type = p.get("type") === "bundle" ? "bundle" : "product";
  const id = p.get("id") ?? "";
  if (!reviewsEnabled() || !subjectPath(type, id)) return NextResponse.json({ error: "No existe." }, { status: 404 });
  return NextResponse.json(await ownState(await currentCustomer(), type, id), noStore);
}

export async function POST(req: Request) {
  if (!reviewsEnabled()) return NextResponse.json({ error: "Las reseñas no están disponibles ahora mismo." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Petición no válida." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  try {
    const c = await requireCustomer();
    if (b.action === "create") await createReview(c, b);
    else if (b.action === "edit") await editReview(c, b);
    else if (b.action === "delete") await deleteReview(c, b.review);
    else return NextResponse.json({ error: "No existe." }, { status: 404 });
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    if (e instanceof AccountError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("reviews", (e as Error).message);
    return NextResponse.json({ error: "No se ha podido guardar. Vuelve a intentarlo." }, { status: 500 });
  }
}
