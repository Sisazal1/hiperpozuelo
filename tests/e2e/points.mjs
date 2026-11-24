// Puntos Hiper: suma, canje, concurrencia, devoluciones, caducidad, vinculación e interfaz. Uso: node tests/e2e/points.mjs [carpeta]
import fs from "node:fs";
import Stripe from "stripe";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE, Client, check, env, lab, product, results } from "./lab.mjs";

const OUT = process.argv[2] || "test-results/fase5";
fs.mkdirSync(OUT, { recursive: true });
const L = lab("pg-points");
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const seed = JSON.parse(fs.readFileSync("src/data/seed/hiper-pozuelo-catalogo-estimado.json", "utf8"));
const bundle = seed.bundles.find((b) => b.category_id === "kitchen" && b.tier === "medium");
const kitchenM = { type: "bundle", bundleId: bundle.id, quantity: 1 };
const PASS = "contraseña-de-prueba";
const opened = [];

const hook = async (type, object) => {
  const payload = JSON.stringify({ id: `evt_lab_${Date.now()}`, object: "event", type, data: { object } });
  return (await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: payload, headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET }) } })).status;
};
let k = 0;
const buy = (c, body = {}) =>
  c.req("POST", "/api/checkout", {
    lines: [kitchenM], delivery: "collect", payment: "online",
    customer: { name: "Cliente Prueba", email: `puntos${++k}@example.com`, phone: `61${String(Date.now()).slice(-5)}${String(k).padStart(2, "0")}` },
    requestKey: `pts-${Date.now()}-${k}`, ...body,
  });
const online = async (c, body) => {
  const r = await buy(c, body);
  const id = r.json?.url?.match(/cs_test_\w+/)?.[0];
  if (!id) throw new Error(`pago ${r.status} ${r.text.slice(0, 200)}`);
  opened.push(id);
  return { id, s: await stripe.checkout.sessions.retrieve(id) };
};
const pay = (o, pi = `pi_lab_${o.id.slice(-12)}`) => hook("checkout.session.completed", { id: o.id, object: "checkout.session", mode: "payment", payment_status: "paid", payment_intent: pi, amount_total: o.s.amount_total });
const pi = (o) => `pi_lab_${o.id.slice(-12)}`;
const me = async (c) => (await c.req("GET", "/api/account/me")).json;
const ledger = (email) => L.sql((q) => q("select l.*, o.code from points_ledger l join customers c on c.id=l.customer_id left join orders o on o.id=l.order_id where c.email=$1 order by l.id", [email]));
const give = (q, email, n) => q("insert into points_ledger (customer_id,type,points,test,reason,actor,ref) select id,'adjust',$2::int,true,'Saldo para la prueba','Prueba','lab:'||gen_random_uuid() from customers where email=$1", [email, n]);
const sum = (rows) => rows.reduce((s, r) => s + r.points, 0);

try {
  await L.start();
  const ana = await new Client().signup("ana@example.com");
  const bea = await new Client().signup("bea@example.com", undefined, "Bea López");
  const eva = await new Client().signup("eva@example.com", undefined, "Eva");
  check("Cuenta nueva: 0 puntos", (await me(ana)).points === 0);

  // ---------- Suma ----------
  const o1 = await online(ana);
  check("Kitchen M cuesta 19,41 €", o1.s.amount_total === 1941, String(o1.s.amount_total));
  check("Sin pagar no suma", (await ledger("ana@example.com")).length === 0);
  check("Webhook de pago: 200", (await pay(o1)) === 200);
  check("Webhook repetido: 200", (await pay(o1)) === 200);
  let rows = await ledger("ana@example.com");
  check("Kitchen M suma 19 puntos, una sola vez", rows.length === 1 && rows[0].points === 19 && rows[0].type === "earn", JSON.stringify(rows.map((r) => [r.type, r.points])));
  check("Marcados como prueba", rows.every((r) => r.test === true));
  check("Pendientes: no se pueden usar", (await me(ana)).points === 0);
  const o1b = await online(ana, { delivery: "delivery", address: { line: "Calle Sevilla 1", postalCode: "28223", city: "Pozuelo de Alarcón" } });
  await pay(o1b);
  rows = await ledger("ana@example.com");
  check("El envío no suma", rows.length === 2 && rows[1].points === 19 && o1b.s.amount_total > 1941, `total ${o1b.s.amount_total}`);
  const o1c = await online(ana, { discountCode: "BIENVENIDA10" });
  await pay(o1c);
  rows = await ledger("ana@example.com");
  check("Con BIENVENIDA10 suma lo pagado, hacia abajo", rows[2].points === Math.floor(o1c.s.amount_total / 100), `${o1c.s.amount_total} → ${rows[2].points}`);

  // ---------- Plazo de 14 días ----------
  const age = (days) => L.sql((q) => q("update orders set status='delivered', delivered_at=now() - make_interval(days => $2) where code=$1", [rows[0].code, days]));
  await age(13);
  check("13 días tras la entrega: pendientes", (await me(ana)).points === 0);
  await age(14);
  check("14 días tras la entrega: disponibles", (await me(ana)).points === 19);

  // ---------- Canje ----------
  check("Invitado no canjea", (await buy(new Client(), { usePoints: true })).json.error === "points_account");
  check("Sin saldo no canjea", (await buy(ana, { usePoints: true })).json.error === "points_balance");
  await L.sql(async (q) => {
    await give(q, "ana@example.com", 60);
    await give(q, "bea@example.com", 60);
    await give(q, "eva@example.com", 50);
  });
  check("No acumulable con BIENVENIDA10", (await buy(bea, { usePoints: true, discountCode: "BIENVENIDA10" })).json.error === "points_coupon");
  const cheap = seed.products.find((p) => p.id === "HP-CLE-001");
  check("Subtotal menor de 10 €: no canjea", (await buy(bea, { usePoints: true, lines: [product(cheap.id)] })).json.error === "points_min");
  const o2 = await online(bea, { usePoints: true });
  check("El canje llega a Stripe como descuento de 2 €", o2.s.amount_total === 1741 && o2.s.total_details.amount_discount === 200, `${o2.s.amount_total}/${o2.s.total_details.amount_discount}`);
  check("Reservado al abrir el pago", (await me(bea)).points === 10);
  await hook("checkout.session.expired", { id: o2.id, object: "checkout.session", mode: "payment" });
  await hook("checkout.session.expired", { id: o2.id, object: "checkout.session", mode: "payment" });
  check("Pago caducado: se libera, una sola vez", (await me(bea)).points === 60);
  const o3 = await online(bea, { usePoints: true });
  const o4 = await online(bea, { usePoints: true });
  check("Reintentar cierra el pago anterior y usa los mismos puntos", (await stripe.checkout.sessions.retrieve(o3.id)).status === "expired" && (await me(bea)).points === 10);
  await pay(o4);
  rows = await ledger("bea@example.com");
  check("Pagado con canje: suma sobre lo pagado (17)", rows.at(-1).type === "earn" && rows.at(-1).points === 17, JSON.stringify(rows.map((r) => [r.type, r.points])));

  // ---------- Dos canjes a la vez ----------
  const two = await Promise.all([buy(eva, { usePoints: true }), buy(eva, { usePoints: true })]);
  two.forEach((r) => r.json?.url && opened.push(r.json.url.match(/cs_test_\w+/)[0]));
  const ok = two.filter((r) => r.status === 200).length;
  check("Dos canjes online a la vez: solo uno", ok === 1 && two.some((r) => r.json.error === "points_balance"), two.map((r) => r.status).join());
  check("Saldo no negativo", (await me(eva)).points === 0);
  await L.sql((q) => give(q, "eva@example.com", 50));
  const later = await Promise.all(Array.from({ length: 4 }, () => buy(eva, { usePoints: true, payment: "later" })));
  const live = sum(await ledger("eva@example.com"));
  check("Cuatro canjes al recoger a la vez: saldo no negativo", live >= 0 && later.filter((r) => r.status === 200).length <= 2, `${later.map((r) => r.status).join()} saldo ${live}`);
  const key = `pts-doble-${Date.now()}`;
  await L.sql((q) => give(q, "eva@example.com", 50 - live));
  const dbl = await Promise.all([1, 2].map(() => buy(eva, { usePoints: true, payment: "later", requestKey: key, customer: { name: "Eva", email: "eva@example.com", phone: "677000111" } })));
  check("Doble clic: un solo pedido", dbl.every((r) => r.status === 200) && dbl[0].json.order === dbl[1].json.order && sum(await ledger("eva@example.com")) === 0);

  // ---------- Devoluciones ----------
  const half = Math.round(o1.s.amount_total / 2);
  const refund = (o, n) => hook("charge.refunded", { object: "charge", payment_intent: pi(o), amount_refunded: n });
  await refund(o1, half);
  await refund(o1, half);
  const of = async (email, code) => (await ledger(email)).filter((r) => r.code === code);
  const code1 = (await ledger("ana@example.com"))[0].code;
  check("Devolución parcial: resta en proporción, una vez", sum(await of("ana@example.com", code1)) === 9, String(sum(await of("ana@example.com", code1))));
  await refund(o1, o1.s.amount_total);
  check("Devolución total: deja el pedido en 0", sum(await of("ana@example.com", code1)) === 0);
  await refund(o4, o4.s.amount_total);
  rows = await ledger("bea@example.com");
  check("Reembolso total con canje: devuelve los 50", (await me(bea)).points === 60 && sum(rows) === 60, JSON.stringify(rows.map((r) => [r.type, r.points])));

  // ---------- Ciclo de suscripción ----------
  const sus = await new Client().signup("sus@example.com", undefined, "Sus");
  const st = await sus.req("POST", "/api/subscription/start", {
    items: ["HP-CLE-001", "HP-CLE-003", "HP-CLE-004", "HP-CLE-006"].map((id) => ({ id, n: 1 })), weeks: 4, delivery: "collect", consent: true,
    customer: { name: "Cliente Prueba", email: "sus@example.com", phone: "600000002" },
  });
  const subSession = st.json.url.match(/cs_test_[A-Za-z0-9_]+/)[0];
  opened.push(subSession);
  const { metadata } = await stripe.checkout.sessions.retrieve(subSession);
  const cus = await stripe.customers.create({ name: "Cliente Prueba", payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
  const goods = await stripe.products.create({ name: "Reposición Hiper Pozuelo", metadata: { kind: "goods" } });
  const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price_data: { currency: "eur", product: goods.id, unit_amount: 671, recurring: { interval: "week", interval_count: 4 } } }], metadata: { hp_subscription: metadata.hp_subscription } });
  for (let i = 0; i < 2; i++) await hook("invoice.paid", { id: sub.latest_invoice, object: "invoice" });
  rows = await ledger("sus@example.com");
  check("Ciclo de suscripción de 6,71 €: 6 puntos, una vez", rows.length === 1 && rows[0].points === 6, JSON.stringify(rows.map((r) => [r.type, r.points])));
  await stripe.subscriptions.cancel(sub.id);
  await stripe.customers.del(cus.id);

  // ---------- Invitado que se vincula ----------
  const guest = async (days) => {
    const c = new Client();
    const o = await c.order([kitchenM]);
    await L.sql((q) => q("update orders set payment_status='verified', created_at=now() - make_interval(days => $2) where code=$1", [o.code, days]));
    return o;
  };
  const g1 = await guest(29);
  const g2 = await guest(31);
  const leo = await new Client().signup("leo@example.com", undefined, "Leo");
  const l1 = await leo.acc("link", { code: g1.code, contact: g1.phone });
  const l2 = await leo.acc("link", { code: g2.code, contact: g2.phone });
  rows = await ledger("leo@example.com");
  check("Vinculado a los 29 días: suma", l1.status === 200 && sum(rows.filter((r) => r.code === g1.code)) === 19, `${l1.status} ${JSON.stringify(rows.map((r) => [r.code, r.points]))}`);
  check("Vinculado a los 31 días: no suma", l2.status === 200 && !rows.some((r) => r.code === g2.code), String(l2.status));
  await leo.acc("link", { code: g1.code, contact: g1.phone });
  check("Una sola vez por pedido", (await ledger("leo@example.com")).length === 1);
  await leo.acc("delete", { password: PASS });
  const mia = await new Client().signup("mia@example.com", undefined, "Mia");
  await mia.acc("link", { code: g1.code, contact: g1.phone });
  check("Ni en otra cuenta tras eliminar la primera", (await ledger("mia@example.com")).length === 0);

  // ---------- Libro y caducidad ----------
  check(
    "El libro no se edita ni se borra",
    await L.sql(async (q) => {
      const tries = ["update points_ledger set points=999", "delete from points_ledger", "update points_ledger set customer_id=null, points=1"];
      let blocked = 0;
      for (const t of tries) await q(t).catch((e) => /inmutable/.test(e.message) && blocked++);
      return blocked === tries.length;
    }),
  );
  const sol = await new Client().signup("sol@example.com", undefined, "Sol");
  await L.sql(async (q) => {
    await q("insert into points_ledger (customer_id,type,points,test,reason,actor,ref,at) select id,'adjust',40,true,'x','Prueba','lab:viejo',now()-interval '13 months' from customers where email='sol@example.com'");
    await q("insert into points_ledger (customer_id,type,points,test,reason,actor,ref) select id,'adjust',500,false,'x','Prueba','lab:real' from customers where email='sol@example.com'");
  });
  check("12 meses sin compras: caducan", (await me(sol)).points === 0);
  await me(sol);
  check("Caducan una vez y con movimiento propio", (await ledger("sol@example.com")).filter((r) => r.type === "expire").map((r) => r.points).join() === "-40");
  check("Puntos reales y de prueba no se mezclan", (await buy(sol, { usePoints: true })).json.error === "points_balance");
  const exp = await ana.req("GET", "/api/account/export");
  check("Salen en la descarga de datos", /"puntos"/.test(exp.text), String(exp.status));

  // ---------- Interfaz ----------
  const browser = await chromium.launch({ channel: "chrome" });
  const errors = [];
  const axe = async (p, name) => {
    const r = await new AxeBuilder({ page: p }).analyze();
    const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    check(`axe ${name}`, !bad.length, bad.map((v) => `${v.id}: ${v.nodes[0].target}`).join(" | "));
  };
  const open = async (width, client) => {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    if (client) await ctx.addCookies(Object.entries(client.jar).map(([name, value]) => ({ name, value, url: BASE })));
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && errors.push(`${p.url()} ${m.text()}`));
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  };
  const noScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  for (const w of [1440, 390]) {
    const p = await open(w, bea);
    await p.goto(`${BASE}/packs/kitchen/medium`, { waitUntil: "networkidle" });
    check(`Ficha ${w}: «sumas 19 puntos»`, await p.getByText("19 puntos", { exact: true }).first().isVisible());
    await p.locator(".pts-note").first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/ficha-${w}.png` });
    await axe(p, `ficha ${w}`);
    await p.evaluate((id) => {
      localStorage.setItem("hp-shared-cart", JSON.stringify([{ type: "bundle", bundleId: id, tier: "medium", quantity: 1 }]));
      localStorage.setItem("hp-account", "1");
      localStorage.setItem("hp-cookies-ack", "1");
    }, bundle.id);
    await p.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
    const cartOk = await p.getByText("19 puntos", { exact: true }).first().isVisible();
    check(`Cesta ${w}: «sumas 19 puntos»`, cartOk);
    check(`Cesta ${w}: el cupón cabe en su tarjeta`, await p.locator(".cart-coupon-row").evaluate((e) => [...e.children].every((c) => c.getBoundingClientRect().right <= document.querySelector(".pts-note + .btn").getBoundingClientRect().right + 1)));
    await p.screenshot({ path: `${OUT}/cesta-${w}.png`, fullPage: true });
    await axe(p, `cesta ${w}`);
    await p.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
    const box = p.getByRole("checkbox", { name: /Usar 50 puntos/ });
    check(`Checkout ${w}: ofrece el canje`, await box.waitFor({ timeout: 8000 }).then(() => true, () => false));
    await box.check();
    check(`Checkout ${w}: el canje baja 2 € y el saldo a sumar`, await p.getByText("17 puntos", { exact: true }).first().isVisible());
    await p.locator(".pts-redeem").scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/checkout-${w}.png`, fullPage: true });
    check(`Checkout ${w} sin scroll horizontal`, await noScroll(p));
    await axe(p, `checkout ${w}`);
    await p.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    await p.getByText("Ver el historial").click();
    check(`Cuenta ${w}: saldo, caducidad e historial`, (await p.locator(".pts-balance dd").first().innerText()) === "60" && (await p.getByText(/Caducan el/).isVisible()) && (await p.locator(".pts-history tbody tr").count()) > 3);
    await p.screenshot({ path: `${OUT}/cuenta-${w}.png`, fullPage: true });
    check(`Cuenta ${w} sin scroll horizontal`, await noScroll(p));
    await axe(p, `cuenta ${w}`);
    await p.context().close();
  }
  const anon = await open(1440);
  await anon.goto(BASE);
  await anon.evaluate((id) => localStorage.setItem("hp-shared-cart", JSON.stringify([{ type: "bundle", bundleId: id, tier: "medium", quantity: 1 }])), bundle.id);
  await anon.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
  check("Sin sesión no hay canje en el checkout", (await anon.locator(".pts-redeem").count()) === 0);
  const gx = await new Client().order([kitchenM]);
  await anon.goto(`${BASE}/pedido/${gx.token}?nuevo=1`, { waitUntil: "networkidle" });
  check("Invitado: «suma 19 puntos» al crear cuenta", await anon.getByText("19 puntos", { exact: true }).first().isVisible());
  await anon.goto(`${BASE}/condiciones#puntos`);
  check("Bases en condiciones", await anon.getByRole("heading", { name: "Bases de Puntos Hiper" }).isVisible());

  // ---------- Backoffice ----------
  const bo = await open(1440);
  await bo.goto(`${BASE}/backoffice/entrar`);
  await bo.getByLabel("Tu nombre").fill("Prueba");
  await bo.getByLabel("Contraseña del equipo").fill(env.BACKOFFICE_PASSWORD);
  await bo.getByRole("button", { name: "Entrar" }).click();
  await bo.waitForURL(`${BASE}/backoffice`);
  await bo.goto(`${BASE}/backoffice/puntos?q=bea`);
  await bo.getByRole("link", { name: "bea@example.com" }).click();
  await bo.waitForURL(/cliente=/);
  await bo.getByLabel("Puntos (con signo").fill("-500");
  await bo.getByLabel("Motivo").fill("Prueba de límite");
  await bo.getByRole("button", { name: "Añadir ajuste" }).click();
  check("Ajuste que deja saldo negativo: no", await bo.getByText("no puede quedar negativo").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await bo.getByLabel("Puntos (con signo").fill("5");
  await bo.getByLabel("Motivo").fill("Compensación por retraso");
  await bo.getByRole("button", { name: "Añadir ajuste" }).click();
  check("Ajuste con motivo y autor", await bo.locator("tr", { hasText: "Compensación por retraso" }).filter({ hasText: "Prueba" }).waitFor({ timeout: 8000 }).then(() => true, () => false));
  await bo.screenshot({ path: `${OUT}/backoffice-puntos-1440.png`, fullPage: true });
  await axe(bo, "backoffice puntos");
  await bo.setViewportSize({ width: 390, height: 844 });
  check("Backoffice sin scroll horizontal a 390", await noScroll(bo));
  // Cancelar un pedido con canje y cobrar y entregar otro, desde la pantalla del equipo.
  await L.sql((q) => give(q, "bea@example.com", 50));
  await bo.setViewportSize({ width: 1440, height: 900 });
  const goOrder = async (token) => {
    const html = (await bea.req("GET", `/pedido/${token}`)).text;
    const c = html.match(/HP-[A-Z0-9]{6}/)[0];
    const [o] = await L.sql((q) => q("select id from orders where code=$1", [c]));
    await bo.goto(`${BASE}/backoffice/pedidos/${o.id}`);
  };
  const before = (await me(bea)).points;
  const canc = await buy(bea, { usePoints: true, payment: "later" });
  check("Canje con pago al recoger: reserva 50", (await me(bea)).points === before - 50);
  await goOrder(canc.json.order);
  bo.on("dialog", (d) => d.accept());
  await bo.getByRole("button", { name: /Cancelar/ }).click();
  await bo.waitForTimeout(2500);
  check("Pedido cancelado: devuelve los canjeados", (await me(bea)).points === before);
  await browser.close();
  check("Consola limpia", !errors.length, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("Recorrido sin interrupciones", false, e.stack.split("\n").slice(0, 4).join(" "));
}
for (const id of opened) await stripe.checkout.sessions.expire(id).catch(() => {});
await L.clean();
console.log(`\n${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
