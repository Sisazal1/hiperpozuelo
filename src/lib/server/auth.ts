import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { dbAvailable, query } from "./db";

const COOKIE = "hp_staff";
const HOURS = 10;
const secret = () => {
  const s = process.env.BACKOFFICE_SECRET;
  return s && s.length >= 24 ? s : null;
};
const sha = (v: string) => createHash("sha256").update(v).digest();
const sign = (v: string) => createHmac("sha256", secret()!).update(v).digest("base64url");

export const backofficeConfigured = () => Boolean(secret() && process.env.BACKOFFICE_PASSWORD && dbAvailable());

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "local").split(",")[0].trim().slice(0, 64);
}

export async function login(name: string, password: string): Promise<"ok" | "bad" | "blocked" | "off"> {
  if (!backofficeConfigured()) return "off";
  const ip = await clientIp();
  const [{ n }] = await query(
    "select count(*)::int as n from login_attempts where ip=$1 and at > now() - interval '15 minutes'",
    [ip],
  );
  if (n >= 8) return "blocked";
  if (!timingSafeEqual(sha(password), sha(process.env.BACKOFFICE_PASSWORD!))) {
    await query("insert into login_attempts (ip) values ($1)", [ip]);
    return "bad";
  }
  await query("delete from login_attempts where ip=$1 or at < now() - interval '1 day'", [ip]);
  const staff = name.trim().replace(/[^\p{L}\p{N} .-]/gu, "").slice(0, 40) || "Equipo";
  const payload = Buffer.from(JSON.stringify({ staff, exp: Date.now() + HOURS * 3600_000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: Boolean(process.env.VERCEL),
    path: "/backoffice",
    maxAge: HOURS * 3600,
  });
  return "ok";
}

export async function logout() {
  (await cookies()).set(COOKIE, "", { path: "/backoffice", maxAge: 0 });
}

export async function currentStaff(): Promise<string | null> {
  if (!backofficeConfigured()) return null;
  const [payload, mac] = ((await cookies()).get(COOKIE)?.value || "").split(".");
  if (!payload || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    return d.exp > Date.now() && typeof d.staff === "string" ? d.staff : null;
  } catch {
    return null;
  }
}

/** Toda página y toda acción del backoffice pasan por aquí. */
export async function requireStaff() {
  const staff = await currentStaff();
  if (!staff) redirect("/backoffice/entrar");
  return staff;
}
