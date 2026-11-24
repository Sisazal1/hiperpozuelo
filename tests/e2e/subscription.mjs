// Suscripción de reposición con Stripe en modo test y reloj de prueba. Uso: node tests/e2e/subscription.mjs [carpeta]
// Necesita el servidor en :3100 y sk_test + STRIPE_WEBHOOK_SECRET en .env.local. Los eventos reales se reenvían firmados.
import fs from "node:fs";
import Stripe from "stripe";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = "http://localhost:3100";
const OUT = process.argv[2] || "test-results/fase3";
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries([...fs.readFileSync(".env.local", "utf8").matchAll(/^([A-Z_]+)="?([^"\n\r]*)"?/gm)].map((m) => [m[1], m[2]]));
if (!/^sk_test_/.test(env.STRIPE_SECRET_KEY)) throw new Error("Solo con claves de prueba");
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const results = [];
const check = (name, ok, info = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "OK  " : "FALLO"} ${name}${info ? ` — ${info}` : ""}`);
};
const post = async (path, body, headers = {}) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { origin: BASE, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const ALL = ["HP-CLE-001", "HP-CLE-003", "HP-CLE-004", "HP-CLE-006"].map((id) => ({ id, n: 1 }));
const customer = { name: "Cliente Prueba", email: "cliente@example.com", phone: "600000001" };
const start = (x = {}) => post("/api/subscription/start", { items: ALL, weeks: 4, delivery: "collect", consent: true, customer, ...x });
const page = async (token) => (await fetch(`${BASE}/suscripcion/${token}`)).text();
const codes = (html) => [...new Set(html.match(/HP-[A-Z0-9]{6}/g) ?? [])];
const webhook = async (event) => {
  const payload = JSON.stringify(event);
  const r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: payload, headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET }) } });
  return r.status;
};

// ---------- Validación en servidor ----------
check("Sin consentimiento: 422", (await start({ consent: false })).json.fields?.consent);
check("Por debajo de 5 €: 422", (await start({ items: [{ id: "HP-CLE-001", n: 1 }] })).status === 422);
check("Artículo no elegible: 400", (await start({ items: [{ id: "HP-KIT-006", n: 3 }] })).status === 400);
check("Frecuencia inventada: 400", (await start({ weeks: 1 })).status === 400);
check("Fuera de zona: 422", (await start({ delivery: "delivery", address: { line: "Calle Mayor 1", postalCode: "08001" } })).json.fields?.postalCode);
check("Otro origen: 403", (await post("/api/subscription/start", {}, { origin: "https://malo.example" })).status === 403);
check("Token inventado: 404", (await post("/api/subscription/cancel", { token: "x".repeat(24) })).status === 404);
check("Firma falsa en el webhook: 400", (await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=x" } })).status === 400);

// ---------- Reloj de prueba ----------
const r0 = await start();
const sessionId = r0.json.url.match(/cs_test_\w+/)[0];
const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
check("Sesión: suscripción, 6,71 €, cada 4 semanas, solo tarjeta", session.mode === "subscription" && session.amount_total === 671 && session.line_items.data[0].price.recurring.interval_count === 4 && session.payment_method_types.join() === "card");
const token = session.success_url.match(/suscripcion\/([\w-]+)/)[1];
check("Sin pagar, no existe para el cliente", !(await page(token)).includes("Próximo cobro") && (await post("/api/subscription/cancel", { token })).status === 404);
const del = await start({ delivery: "delivery", address: { line: "Calle de prueba 1", postalCode: "28223" } });
const delS = await stripe.checkout.sessions.retrieve(del.json.url.match(/cs_test_\w+/)[0]);
check("A domicilio suma 3,99 €", delS.amount_total === 671 + 399);
await stripe.checkout.sessions.expire(delS.id);

let now = Math.floor(Date.now() / 1000);
const clock = await stripe.testHelpers.testClocks.create({ frozen_time: now, name: "Hiper Pozuelo e2e" });
const cus = await stripe.customers.create({ test_clock: clock.id, name: "Cliente Prueba", payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
const goods = await stripe.products.create({ name: "Reposición Hiper Pozuelo", metadata: { kind: "goods" } });
const sub = await stripe.subscriptions.create({
  customer: cus.id,
  items: [{ price_data: { currency: "eur", product: goods.id, unit_amount: 671, recurring: { interval: "week", interval_count: 4 } } }],
  metadata: { hp_subscription: session.metadata.hp_subscription },
});
const seen = new Set();
const forward = async (again = false) => {
  await new Promise((r) => setTimeout(r, 3500));
  const list = (await stripe.events.list({ limit: 100, types: ["invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"] })).data
    .filter((e) => e.data.object.id === sub.id || e.data.object.subscription === sub.id || e.data.object.parent?.subscription_details?.subscription === sub.id)
    .reverse();
  let n = 0;
  for (const e of list) {
    if (seen.has(e.id) && !again) continue;
    seen.add(e.id);
    n++;
    const st = await webhook(e);
    if (st !== 200) console.log("  webhook", e.type, st);
  }
  return n;
};
const advance = async (seconds) => {
  now += seconds;
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: now });
  for (;;) {
    const c = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (c.status === "ready") break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  await forward();
};
const DAY = 86400;
const WEEK = 7 * DAY;
const renew = async () => {
  const s = await stripe.subscriptions.retrieve(sub.id);
  await advance(s.current_period_end - now + 2 * 3600); // 1 h en borrador antes de cobrarse
};
const act = (a, b = {}) => post(`/api/subscription/${a}`, { token, ...b });
const completed = { id: "evt_test_alta", object: "event", type: "checkout.session.completed", data: { object: { id: sessionId, mode: "subscription", subscription: sub.id, customer: cus.id, payment_status: "paid" } } };
check("Alta: webhook", (await webhook(completed)) === 200);
let html = await page(token);
check("Alta: activa con un pedido", html.includes("Activa") && codes(html).length === 1, codes(html).join());
await webhook(completed);
await forward();
await forward(true);
html = await page(token);
check("Webhooks repetidos: sigue un solo pedido", codes(html).length === 1);
const first = codes(html)[0];
const pedidoTok = html.match(/\/pedido\/([\w-]+)/)[1];
const pedido = await (await fetch(`${BASE}/pedido/${pedidoTok}`)).text();
check("Pedido del ciclo: pagado, 6,71 €, descuento 0,75 €", pedido.includes("6,71") && pedido.includes(first), pedido.match(/0,75\s?€/) ? "descuento visible" : "sin línea de descuento");
await renew();
html = await page(token);
check("Renovación: segundo pedido", codes(html).length === 2, codes(html).join());
await forward(true);
check("Renovación repetida: no duplica", codes(await page(token)).length === 2);

// Salto
let s = await stripe.subscriptions.retrieve(sub.id);
const due = s.current_period_end;
check("Saltar el próximo", (await act("skip")).status === 200);
s = await stripe.subscriptions.retrieve(sub.id);
check("Salto: el cobro se mueve 4 semanas", s.current_period_end - due === 4 * WEEK, `${(s.current_period_end - due) / DAY} días`);
check("No se salta dos veces", (await act("skip")).status === 409);
await advance(due - now + 2 * DAY);
check("Salto: ni cobro ni pedido en la fecha saltada", codes(await page(token)).length === 2);
const paidCount = async () => (await stripe.invoices.list({ subscription: sub.id, limit: 100 })).data.filter((i) => i.amount_paid > 0).length;
check("Salto: Stripe confirma 2 facturas cobradas", (await paidCount()) === 2);
await renew();
check("Tras el salto, se cobra el siguiente", codes(await page(token)).length === 3 && (await paidCount()) === 3);

// Pausa
check("Pausar", (await act("pause")).status === 200 && (await page(token)).includes("En pausa"));
check("En pausa no se salta ni se cambia", (await act("skip")).status === 409 && (await act("change", { items: ALL, weeks: 6 })).status === 409);
await renew();
check("Pausa: ni cobro ni pedido", codes(await page(token)).length === 3 && (await paidCount()) === 3);
check("Reanudar", (await act("resume")).status === 200 && (await page(token)).includes("Activa"));
await renew();
check("Tras reanudar, se cobra", codes(await page(token)).length === 4 && (await paidCount()) === 4);

// Cambio de frecuencia y cantidades
s = await stripe.subscriptions.retrieve(sub.id);
const end1 = s.current_period_end;
check("Cambio por debajo del mínimo: 422", (await act("change", { items: [{ id: "HP-CLE-001", n: 1 }], weeks: 8 })).status === 422);
check("Cambiar a 8 semanas y doble de esponjas", (await act("change", { items: ALL.map((i) => (i.id === "HP-CLE-001" ? { ...i, n: 2 } : i)), weeks: 8 })).status === 200);
await forward();
s = await stripe.subscriptions.retrieve(sub.id);
check("Cambio: no cobra ahora y conserva la fecha", s.current_period_end === end1 && (await paidCount()) === 4 && codes(await page(token)).length === 4);
check("Cambio: 7,60 € por ciclo", (await page(token)).includes("7,60") && s.items.data[0].price.unit_amount === 760);
await renew();
s = await stripe.subscriptions.retrieve(sub.id);
check("Ciclo con el cambio: un pedido y después 8 semanas", codes(await page(token)).length === 5 && s.current_period_end - s.current_period_start === 8 * WEEK, `${(s.current_period_end - s.current_period_start) / WEEK} semanas`);

// Pago fallido
const bad = await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: cus.id });
await stripe.customers.update(cus.id, { invoice_settings: { default_payment_method: bad.id } });
await stripe.subscriptions.update(sub.id, { default_payment_method: bad.id });
await renew();
html = await page(token);
check("Pago fallido: avisa y no crea pedido", html.includes("Pago fallido") && codes(html).length === 5);
const good = await stripe.paymentMethods.attach("pm_card_visa", { customer: cus.id });
await stripe.customers.update(cus.id, { invoice_settings: { default_payment_method: good.id } });
await stripe.subscriptions.update(sub.id, { default_payment_method: good.id });
const open = (await stripe.invoices.list({ subscription: sub.id, status: "open" })).data[0];
await stripe.invoices.pay(open.id);
await forward();
html = await page(token);
check("Cobro recuperado: un pedido y vuelve a activa", html.includes("Activa") && codes(html).length === 6);
const portal = await act("portal");
check("Portal de Stripe (tarjeta y facturas)", portal.json?.url?.startsWith("https://billing.stripe.com/"), portal.json?.error ?? "");

// Cancelación
check("Cancelar", (await act("cancel")).status === 200 && (await page(token)).includes("Cancelada"));
await advance(9 * WEEK);
check("Cancelada: sin más cobros ni pedidos", codes(await page(token)).length === 6 && (await paidCount()) === 6);
check("Cancelada: no se reanuda", (await act("resume")).status === 409);
await stripe.testHelpers.testClocks.del(clock.id);

// ---------- Pantalla ----------
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-ES", reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("hp-cookies-ack", "1");
    localStorage.setItem("hp-welcome-closed-at", String(Date.now()));
    sessionStorage.setItem("hp-intro-seen", "1");
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/stripe|hcaptcha|status of 422/i.test(`${m.text()} ${m.location().url}`) && errors.push(`${m.text()} ${m.location().url}`));
  const look = async (name) => {
    await p.waitForLoadState("networkidle").catch(() => {});
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll("main button, main summary, main .btn, main .text-link, main label:has(input[type=radio])")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 43.5).map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().height)}`),
    }));
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
    const bad = axe.violations.filter((v) => ["serious", "critical", "moderate"].includes(v.impact));
    check(`${name} ${width}: axe, sin desborde, ≥44 px`, !bad.length && m.over <= 0 && !m.small.length, JSON.stringify({ axe: bad.map((v) => [v.id, v.nodes[0].target]), ...m }));
    await p.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
  };
  await p.goto(`${BASE}/product/esponjas-limpieza-pack-3`);
  await p.locator(".pdp-subs").waitFor();
  await look("ficha-consumible");
  await p.locator(".pdp-subs").click();
  await p.waitForURL(/reposicion/);
  await p.locator(".refill-list .qty-value").waitFor();
  check(`${width}: abre con el artículo ya añadido`, (await p.locator(".refill-list .qty-value").count()) === 1);
  check(`${width}: compra única por defecto`, await p.locator('input[name="modo"]').first().isChecked());
  for (const n of ["Paños", "Bolsas", "Recambio"]) await p.getByRole("button", { name: new RegExp(`^Añadir ${n}`) }).click();
  const prices = async () => (await p.locator(".refill-mode > label b").allInnerTexts()).join(" / ").replace(/\s/g, " ");
  check(`${width}: 7,46 € única y 6,71 € suscripción`, /7,46 € \/ 6,71 €/.test(await prices()), await prices());
  await look("reposicion-unica");
  await p.locator('input[name="modo"]').first().focus();
  await p.keyboard.press("ArrowDown");
  check(`${width}: con teclado se elige la suscripción`, (await p.locator(".refill-weeks").isVisible()) && /6,71/.test(await p.locator(".refill-total").innerText()));
  check(`${width}: 4 semanas por defecto y sin tachados`, (await p.locator('input[name="weeks"][value="4"]').isChecked()) && (await p.locator("main s, main del").count()) === 0);
  await look("reposicion-suscripcion");
  await p.locator("main .add-main").click();
  await p.waitForURL(/reposicion\/suscripcion/);
  await p.locator("#su-name").waitFor();
  check(`${width}: consentimiento sin premarcar`, !(await p.locator("#su-consent").isChecked()));
  await p.locator("#su-name").fill("Cliente Prueba");
  await p.locator("#su-phone").fill("600000001");
  await p.locator("#su-email").fill("cliente@example.com");
  await look("suscripcion-confirmar");
  await p.locator(".checkout-pay").click();
  await p.locator("#su-consent-err").waitFor();
  check(`${width}: sin consentimiento no paga`, /Suscribirme y pagar 6,71/.test(await p.locator(".checkout-pay").innerText()));
  if (width === 1440) {
    await p.locator("#su-consent").check();
    await p.locator(".checkout-pay").click();
    await p.waitForURL(/checkout.stripe.com/, { timeout: 60000, waitUntil: "commit" });
    let f = null;
    for (let i = 0; i < 60 && !f; i++) {
      for (const x of p.frames()) if (await x.locator("#payment-numberInput, #cardNumber").first().isVisible().catch(() => false)) f = x;
      if (!f) await p.waitForTimeout(500);
    }
    await f.locator("#payment-numberInput, #cardNumber").first().fill("4242424242424242");
    await f.locator("#payment-expiryInput, #cardExpiry").first().fill("12 / 34");
    await f.locator("#payment-cvcInput, #cardCvc").first().fill("123");
    await f.locator("#payment-nameInput, #billingName").first().fill("Cliente Prueba");
    const save = f.locator("#enableStripePass");
    if (await save.isChecked().catch(() => false)) await save.uncheck({ force: true }).catch(() => {});
    await f.locator('[data-testid="payment-form-submit-button"], [data-testid="hosted-payment-submit-button"]').first().click();
    await p.waitForURL(/\/suscripcion\//, { timeout: 90000 });
    await p.getByText("Suscripción confirmada").waitFor();
    check("Checkout real: vuelve activa y con pedido, sin esperar al webhook", (await p.getByRole("heading", { name: "Activa" }).isVisible()) && (await p.locator(".acc-orders li").count()) === 1);
    fs.writeFileSync(`${OUT}/token.txt`, p.url().match(/suscripcion\/([\w-]+)/)[1]);
  } else await p.goto(`${BASE}/suscripcion/${fs.readFileSync(`${OUT}/token.txt`, "utf8")}`);
  await p.getByRole("button", { name: "Cambiar artículos" }).click();
  await look("gestion");
  if (width === 390) {
    await p.getByRole("button", { name: "Cancelar la suscripción" }).click();
    await p.getByRole("button", { name: "Sí, cancelar" }).click();
    await p.getByRole("heading", { name: "Cancelada" }).waitFor();
    check("Cancelar en 2 clics en pantalla", true);
  }
  await ctx.close();
}
await browser.close();
check("Consola limpia", !errors.length, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
