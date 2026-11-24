// Cuenta de cliente opcional, probada contra la API y en pantalla. Uso: node tests/e2e/account.mjs [carpeta]
// Necesita el servidor en :3100 con base de datos local y sin producción.
import fs from "node:fs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.AUDIT_URL || "http://localhost:3100";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("Solo en local");
const OUT = process.argv[2] || "test-results/fase2";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "OK  " : "FALLO"} ${name}${info ? ` — ${info}` : ""}`);
};
const run = Date.now().toString(36);
const PASS = `prueba-${run}-larga`;
let ipn = 0;
const newIp = () => `10.${Math.floor(Date.now() / 1000) % 250}.${Date.now() % 250}.${++ipn}`;
/** Cliente HTTP con su propio tarro de cookies e IP. */
class Client {
  jar = {};
  ip = newIp();
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
      this.lastCookie = c;
    }
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: r.status, json, text };
  }
  acc(action, body = {}, headers) {
    return this.req("POST", `/api/account/${action}`, body, headers);
  }
  page(path) {
    return this.req("GET", path);
  }
}
const phone = () => `6${String(Date.now()).slice(-6)}${String(++ipn).padStart(2, "0")}`;
const order = async (client, email, ph = phone()) => {
  const r = await client.req("POST", "/api/checkout", {
    lines: [{ type: "product", productId: "HP-KIT-006", quantity: 1 }],
    delivery: "collect", payment: "later", customer: { name: "Cliente Prueba", email, phone: ph }, requestKey: `t-${run}-${++ipn}`,
  });
  const token = r.json?.order;
  if (!token) throw new Error(`pedido: ${r.status} ${r.text.slice(0, 200)}`);
  const html = (await client.page(`/pedido/${token}`)).text;
  return { token, phone: ph, code: html.match(/HP-[A-Z0-9]{6}/)[0] };
};
const mail = (n) => `${n}-${run}@example.com`;
const has = async (c, code) => (await c.page("/account")).text.includes(code);

// ---------- Sin cuenta ----------
const guest = new Client();
const victim = mail("victima");
const o1 = await order(guest, victim);
check("Invitado compra y sigue su pedido sin cuenta", Boolean(o1.code), o1.code);

// ---------- Email ajeno ----------
const mallory = new Client();
let r = await mallory.acc("register", { email: victim, password: PASS, terms: true });
check("Alta con email ajeno posible (no verificado)", r.status === 200);
check("Cuenta con email ajeno NO ve el pedido", !(await has(mallory, o1.code)));
check("Cookie httpOnly y SameSite", /httponly/i.test(mallory.lastCookie) && /samesite=lax/i.test(mallory.lastCookie));
r = await mallory.acc("link", { code: o1.code, contact: "otro@example.com" });
check("Código con contacto equivocado: 404", r.status === 404);
const exp0 = await mallory.req("GET", "/api/account/export");
check("Exportar no incluye el pedido ajeno", exp0.status === 200 && !exp0.text.includes(o1.code));

// ---------- Vincular ----------
const ana = new Client();
check("Alta sin aceptar condiciones: 422", (await ana.acc("register", { email: mail("ana"), password: PASS })).status === 422);
check("Contraseña corta: 422", (await ana.acc("register", { email: mail("ana"), password: "corta", terms: true })).status === 422);
check("Alta correcta", (await ana.acc("register", { email: mail("ana"), password: PASS, terms: true })).status === 200);
check("Vincular por código y teléfono", (await ana.acc("link", { code: o1.code, contact: o1.phone })).status === 200 && (await has(ana, o1.code)));
check("Un pedido, una cuenta: por enlace", (await mallory.acc("link-token", { token: o1.token })).status === 409);
check("Un pedido, una cuenta: por código", (await mallory.acc("link", { code: o1.code, contact: o1.phone })).status === 409);
check("Reclamar un pedido ya vinculado: 409", (await new Client().acc("claim", { token: o1.token, password: PASS, terms: true })).status === 409);
const o2 = await order(ana, mail("ana"));
check("Compra con sesión: vinculado solo", await has(ana, o2.code));
const g2 = new Client();
const o3 = await order(g2, mail("bea"));
check("Reclamar tras comprar: solo contraseña", (await g2.acc("claim", { token: o3.token, password: PASS, terms: true })).status === 200 && (await has(g2, o3.code)));

// ---------- Seguridad ----------
const anon = new Client();
check("CSRF: otro origen 403", (await ana.acc("profile", { name: "X" }, { origin: "https://malo.example" })).status === 403);
check("CSRF: sin origen 403", (await ana.acc("profile", { name: "X" }, { origin: "" })).status === 403);
check("CSRF: formulario 403", (await ana.acc("profile", { name: "X" }, { "content-type": "text/plain" })).status === 403);
check("Sin sesión: 401", (await anon.acc("profile", { name: "X" })).status === 401 && (await anon.req("GET", "/api/account/export")).status === 401);
check("Acción heredada del prototipo: 404", (await anon.acc("constructor")).status === 404);
const wrong = await anon.acc("login", { email: mail("ana"), password: "incorrecta-larga" });
const none = await anon.acc("login", { email: mail("nadie"), password: "incorrecta-larga" });
check("Error igual exista o no el email", wrong.status === none.status && wrong.json.error === none.json.error);
const dup = await new Client().acc("register", { email: mail("ana"), password: PASS, terms: true });
check("Alta repetida no confirma que exista", dup.status === 409 && !/existe|registrad/i.test(dup.json.error), dup.json.error);
let last = 0;
for (let i = 0; i < 10; i++) last = (await new Client().acc("login", { email: mail("bea"), password: "incorrecta-larga" })).status;
check("Límite por email aunque cambie la IP: 429", last === 429);
const bo = await ana.page("/backoffice/pedidos");
check("La cookie de cliente no abre el backoffice", !bo.text.includes(o1.code) && !bo.text.includes(o2.code), String(bo.status));
const staffAsCustomer = new Client();
staffAsCustomer.jar = { hp_staff: ana.jar.hp_customer };
check("El valor de sesión como hp_staff tampoco", !(await staffAsCustomer.page("/backoffice/pedidos")).text.includes(o2.code));
const ana2 = new Client();
const before = ana.jar.hp_customer;
check("Entrar en otro dispositivo", (await ana2.acc("login", { email: mail("ana"), password: PASS })).status === 200);
await ana.acc("login", { email: mail("ana"), password: PASS });
check("Rotación: sesión nueva al entrar", ana.jar.hp_customer !== before);
const stale = new Client();
stale.jar = { hp_customer: before };
check("La sesión anterior queda revocada", (await stale.req("GET", "/api/account/export")).status === 401);
check("Cerrar en todos los dispositivos", (await ana.acc("logout-all")).status === 200 && (await ana2.req("GET", "/api/account/export")).status === 401);
await ana.acc("login", { email: mail("ana"), password: PASS });
await ana2.acc("login", { email: mail("ana"), password: PASS });
check("Cambiar contraseña exige la actual", (await ana.acc("password", { current: "mala-contraseña", next: `${PASS}2` })).status === 401);
check("Cambiar contraseña cierra las demás", (await ana.acc("password", { current: PASS, next: `${PASS}2` })).status === 200 && (await ana2.req("GET", "/api/account/export")).status === 401 && (await ana.req("GET", "/api/account/export")).status === 200);

// ---------- Datos ----------
check("Dirección fuera de zona: 422", (await ana.acc("address-add", { line: "Calle Mayor 1", postalCode: "08001" })).status === 422);
check("Dirección guardada", (await ana.acc("address-add", { line: "Calle <b>Mayor</b> 1", postalCode: "28223" })).status === 200);
check("HTML escapado", !(await ana.page("/account")).text.includes("<b>Mayor</b>"));
const fav = await ana.acc("favorites-merge", { ids: ["HP-KIT-006", "no-existe"] });
check("Favoritos unidos y filtrados", JSON.stringify(fav.json.favorites) === '["HP-KIT-006"]');
const addrId = (await ana.req("GET", "/api/account/me")).json.addresses[0].id;
await mallory.acc("address-remove", { id: addrId });
check("No se borra la dirección de otra cuenta", (await ana.req("GET", "/api/account/me")).json.addresses.length === 1);
const exp = await ana.req("GET", "/api/account/export");
check("Exportar incluye pedidos y no la contraseña", exp.text.includes(o2.code) && !/scrypt|password_hash/.test(exp.text));
check("Marketing sin premarcar", exp.json.perfil.marketing === false);
check("Eliminar exige contraseña", (await ana.acc("delete", { password: "mala-contraseña" })).status === 401);
check("Eliminar la cuenta", (await ana.acc("delete", { password: `${PASS}2` })).status === 200);
const tracking = await new Client().page(`/pedido/${o2.token}`);
check("El pedido se conserva sin vínculo", tracking.status === 200 && tracking.text.includes(o2.code));
check("No se puede volver a entrar", (await ana.acc("login", { email: mail("ana"), password: `${PASS}2` })).status === 401);

// ---------- Pantalla ----------
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-ES", reducedMotion: "reduce" });
  await ctx.setExtraHTTPHeaders({});
  await ctx.addInitScript(() => {
    localStorage.setItem("hp-cookies-ack", "1");
    localStorage.setItem("hp-welcome-closed-at", String(Date.now()));
    sessionStorage.setItem("hp-intro-seen", "1");
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(`${m.text()} ${m.location().url}`));
  const look = async (name) => {
    await p.waitForLoadState("networkidle").catch(() => {});
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("main button, main summary, main input:not([type=checkbox]), main .acc-check, main .btn, main .text-link")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 43.5).map((e) => `${e.tagName}.${e.className}:${e.textContent.slice(0, 20)} ${Math.round(e.getBoundingClientRect().height)}`),
    }));
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    check(`${name} ${width}: axe, sin desborde, ≥44 px`, !bad.length && m.over <= 0 && !m.small.length, JSON.stringify({ axe: bad.map((v) => [v.id, v.nodes[0].target]), ...m }));
    await p.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
  };
  await p.goto(`${BASE}/account`);
  await look("cuenta-sin-sesion");
  check(`${width}: sin Google ni recuperar contraseña`, (await p.getByText(/Google|olvidad|recuperar|verifica/i).count()) === 0);
  const c = new Client();
  const em = mail(`pantalla${width}`);
  const o = await order(c, em);
  await p.goto(`${BASE}/pedido/${o.token}?nuevo=1`);
  await look("pedido-invitado");
  await p.locator("#claim-password").fill(PASS);
  await p.locator("#claim-terms").check();
  check(`${width}: marketing sin marcar`, !(await p.locator("#claim-marketing").isChecked()));
  await p.locator(".acc-claim button").click();
  await p.waitForURL(`${BASE}/account`);
  await p.getByRole("heading", { level: 1 }).waitFor();
  check(`${width}: el pedido aparece en la cuenta con su QR`, (await p.getByText(o.code).first().isVisible()) && (await p.locator(".order-qr svg").count()) === 1);
  await p.getByLabel("Código postal").fill("28223");
  await p.getByLabel("Calle, número y piso").fill("Calle de prueba 2, 3.º B");
  await p.getByRole("button", { name: "Guardar dirección" }).click();
  await p.getByText("Calle de prueba 2").waitFor();
  await p.locator("summary").first().click();
  await look("cuenta-con-sesion");
  await p.goto(`${BASE}/product/espatula-silicona`);
  await p.waitForTimeout(800);
  await p.locator('button[aria-label*="avorito"]').first().click();
  await p.waitForTimeout(800);
  await p.goto(`${BASE}/account`);
  check(`${width}: favorito sincronizado`, (await p.locator(".acc-favs a").count()) === 1);
  await p.goto(`${BASE}/product/espatula-silicona`);
  await p.waitForTimeout(800);
  await p.locator(".add-main").first().click();
  await p.waitForTimeout(500);
  await p.goto(`${BASE}/checkout`);
  await p.locator("#co-name").waitFor();
  await p.waitForTimeout(1200);
  check(`${width}: checkout con datos de la cuenta`, (await p.locator("#co-email").inputValue()) === em, await p.locator("#co-line").inputValue().catch(() => ""));
  await p.goto(`${BASE}/account`);
  await p.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await p.getByRole("heading", { name: "Entrar" }).waitFor();
  check(`${width}: cerrar sesión`, true);
  await ctx.close();
}
await browser.close();
check("Consola limpia", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
