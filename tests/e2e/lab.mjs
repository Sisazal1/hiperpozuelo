// Servidor aislado con su propia base de datos, para probar estados que la tienda no deja forzar (entregado hace 31 días, pedido real).
// Usa el build ya hecho en .next: no lo ejecutes mientras hay otro servidor sirviendo ese build.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";

export const PORT = 3200;
export const BASE = `http://localhost:${PORT}`;
export const env = Object.fromEntries([...fs.readFileSync(".env.local", "utf8").matchAll(/^([A-Z_]+)="?([^"\n\r]*)"?/gm)].map((m) => [m[1], m[2]]));
if (!/^sk_test_/.test(env.STRIPE_SECRET_KEY)) throw new Error("Solo con claves de prueba");

export const results = [];
export const check = (name, ok, info = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "OK  " : "FALLO"} ${name}${info ? ` — ${info}` : ""}`);
};

export function lab(name) {
  const dir = `.data/${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  let proc = null;
  const start = async () => {
    proc = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { env: { ...process.env, PGLITE_DIR: dir, NEXT_PUBLIC_SITE_URL: BASE }, stdio: ["ignore", "pipe", "pipe"] });
    proc.stderr.on("data", (d) => /error/i.test(d) && console.log("  servidor:", String(d).slice(0, 300)));
    for (let i = 0; i < 60; i++) {
      if (await fetch(`${BASE}/api/availability`).then((r) => r.ok, () => false)) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("El servidor no arranca");
  };
  const stop = async () => {
    if (!proc) return;
    const done = new Promise((r) => proc.once("exit", r));
    proc.kill();
    await done;
    proc = null;
  };
  return {
    start,
    stop,
    /** Para el servidor, cambia la base de datos y lo vuelve a arrancar. */
    sql: async (fn) => {
      await stop();
      const db = await PGlite.create(dir);
      const out = await fn(async (sql, p = []) => (await db.query(sql, p)).rows);
      await db.close();
      await start();
      return out;
    },
    clean: async () => {
      await stop();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

let n = 0;
export class Client {
  jar = {};
  ip = `10.9.${Math.floor(Date.now() / 1000) % 250}.${++n}`;
  async req(method, path, body, headers = {}) {
    const r = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { origin: BASE, "content-type": "application/json", "x-forwarded-for": this.ip, cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      if (kv.slice(i + 1)) this.jar[kv.slice(0, i)] = kv.slice(i + 1);
      else delete this.jar[kv.slice(0, i)];
    }
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: r.status, json, text };
  }
  acc(action, body = {}) {
    return this.req("POST", `/api/account/${action}`, body);
  }
  async signup(email, pass = "contraseña-de-prueba", name = "Ana García") {
    await this.acc("register", { email, password: pass, terms: true });
    await this.acc("profile", { name });
    return this;
  }
  async order(lines, extra = {}) {
    const ph = `6${String(Date.now()).slice(-6)}${String(++n % 100).padStart(2, "0")}`;
    const r = await this.req("POST", "/api/checkout", { lines, delivery: "collect", payment: "later", customer: { name: "Cliente Prueba", email: `compra${n}@example.com`, phone: ph }, requestKey: `lab-${Date.now()}-${n}`, ...extra });
    if (!r.json?.order) throw new Error(`pedido ${r.status} ${r.text.slice(0, 200)}`);
    const html = (await this.req("GET", `/pedido/${r.json.order}`)).text;
    return { token: r.json.order, code: html.match(/HP-[A-Z0-9]{6}/)[0], phone: ph };
  }
}
export const product = (productId, quantity = 1) => ({ type: "product", productId, quantity });
