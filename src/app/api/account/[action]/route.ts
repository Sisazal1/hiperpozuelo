import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { sameOrigin } from "@/lib/server/guard";
import * as acc from "@/lib/server/customers";

export const runtime = "nodejs";
const noStore = { headers: { "cache-control": "no-store" } };

type Body = Record<string, unknown>;
const OPEN: Record<string, (b: Body) => Promise<unknown>> = {
  register: (b) => acc.register({ email: acc.cleanEmail(b.email), password: b.password, name: b.name, marketing: b.marketing, terms: b.terms }),
  claim: (b) => acc.registerFromOrder(String(b.token ?? ""), { password: b.password, marketing: b.marketing, terms: b.terms }),
  login: (b) => acc.login(b.email, b.password),
  logout: () => acc.logout(),
};
const PRIVATE: Record<string, (c: acc.Customer, b: Body) => Promise<unknown>> = {
  "logout-all": () => acc.logout(true),
  link: (c, b) => acc.linkByCode(c, b.code, b.contact),
  "link-token": (c, b) => acc.linkByToken(c, b.token),
  profile: (c, b) => acc.updateProfile(c, b),
  password: (c, b) => acc.changePassword(c, b.current, b.next),
  "address-add": (c, b) => acc.addAddress(c, b),
  "address-remove": (c, b) => acc.removeAddress(c, b.id),
  "favorites-merge": async (c, b) => ({ favorites: await acc.mergeFavorites(c, b.ids) }),
  favorite: (c, b) => acc.setFavorite(c, b.id, b.on),
  delete: (c, b) => acc.deleteAccount(c, b.password),
};

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!dbAvailable()) return NextResponse.json({ error: "Las cuentas no están disponibles ahora mismo." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Petición no válida." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Body;
  try {
    let out: unknown;
    if (Object.hasOwn(OPEN, action)) out = await OPEN[action](b);
    else if (Object.hasOwn(PRIVATE, action)) out = await PRIVATE[action](await acc.requireCustomer(), b);
    else return NextResponse.json({ error: "No existe." }, { status: 404 });
    return NextResponse.json({ ok: true, ...(out && typeof out === "object" && !Array.isArray(out) ? out : {}) }, noStore);
  } catch (e) {
    if (e instanceof acc.AccountError) return NextResponse.json({ error: e.message }, { status: e.status, ...noStore });
    console.error("account", action, (e as Error).message);
    return NextResponse.json({ error: "No se ha podido completar. Vuelve a intentarlo." }, { status: 500 });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const c = await acc.currentCustomer();
  if (action === "me")
    return NextResponse.json(c ? { customer: { email: c.email, name: c.name, phone: c.phone }, addresses: await acc.addresses(c.id), favorites: await acc.favoriteIds(c.id) } : { customer: null }, noStore);
  if (action === "export" && c)
    return new NextResponse(JSON.stringify(await acc.exportData(c), null, 2), {
      headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="mis-datos-hiper-pozuelo.json"', "cache-control": "no-store" },
    });
  return NextResponse.json({ error: "No existe." }, { status: action === "export" ? 401 : 404 });
}
