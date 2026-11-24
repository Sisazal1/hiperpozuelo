import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { dbAvailable } from "@/lib/server/db";
import { AccountError, loginWithGoogle } from "@/lib/server/customers";
import { googleEnabled } from "@/lib/server/google";

export const runtime = "nodejs";
const STATE = "hp_google_state";

/** «Continuar con Google»: solo existe si hay credenciales en el entorno. */
export async function GET(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!googleEnabled() || !dbAvailable()) return new NextResponse(null, { status: 404 });
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const redirect = `${origin}/api/google/callback`;
  const jar = await cookies();
  if (step === "start") {
    const state = randomBytes(24).toString("base64url");
    jar.set(STATE, state, { httpOnly: true, sameSite: "lax", secure: Boolean(process.env.VERCEL), path: "/api/google", maxAge: 600 });
    const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirect, response_type: "code", scope: "openid email profile", state });
    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  }
  if (step !== "callback") return new NextResponse(null, { status: 404 });
  const expected = jar.get(STATE)?.value;
  jar.set(STATE, "", { path: "/api/google", maxAge: 0 });
  const back = (e: string) => NextResponse.redirect(`${origin}/account?google=${e}`);
  const code = url.searchParams.get("code");
  if (!expected || url.searchParams.get("state") !== expected || !code) return back("error");
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirect, grant_type: "authorization_code" }),
    });
    if (!r.ok) return back("error");
    // El token llega directo de Google por TLS: no hace falta volver a comprobar su firma.
    const { id_token } = (await r.json()) as { id_token: string };
    const p = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString());
    if (p.aud !== process.env.GOOGLE_CLIENT_ID || !/^(https:\/\/)?accounts\.google\.com$/.test(p.iss) || p.exp * 1000 < Date.now() || !p.email_verified) return back("error");
    await loginWithGoogle({ sub: p.sub, email: p.email, name: p.name });
    return NextResponse.redirect(`${origin}/account`);
  } catch (e) {
    return back(e instanceof AccountError ? "existe" : "error");
  }
}
