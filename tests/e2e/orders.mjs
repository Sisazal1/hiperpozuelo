// Recorrido completo con pagos de prueba de Stripe. Uso: node tests/e2e/orders.mjs [carpeta de capturas]
// Necesita el servidor en :3100, claves sk_test y las variables BACKOFFICE_* en .env.local.
import fs from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.AUDIT_URL || "http://localhost:3100";
const OUT = process.argv[2] || "test-results/e2e";
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries([...fs.readFileSync(".env.local", "utf8").matchAll(/^([A-Z_]+)="?([^"\n\r]*)"?/gm)].map((m) => [m[1], m[2]]));
if (!/^sk_test_/.test(env.STRIPE_SECRET_KEY)) throw new Error("Solo con claves de prueba");

const results = [];
const check = (name, ok, info = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "OK  " : "FALLO"} ${name}${info ? ` — ${info}` : ""}`);
};
const run = Date.now().toString(36).toUpperCase();
const phone = (n) => `6${String(Date.now()).slice(-7)}${n}`;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = async (w = 1440, h = 900) => {
  const c = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-ES" });
  await c.addInitScript(() => {
    window.__hpTrack = true;
    localStorage.setItem("hp-cookies-ack", "1");
    localStorage.setItem("hp-welcome-closed-at", String(Date.now()));
    sessionStorage.setItem("hp-intro-seen", "1");
  });
  const p = await c.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && p.errors.push(`${m.text()} ${m.location().url}`));
  return p;
};
const shot = async (p, n) => {
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
};
const addProduct = async (p, slug = "espatula-silicona", n = 1) => {
  await p.goto(`${BASE}/product/${slug}`);
  for (let i = 0; i < n; i++) {
    await p.locator(".add-main").click();
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
  }
};
const fill = async (p, o) => {
  await p.goto(`${BASE}/checkout`);
  await p.locator("#co-name").waitFor();
  await p.waitForFunction(() => document.querySelectorAll('input[name="payment"]').length > 1);
  await p.locator(`input[name="delivery"][value="${o.delivery}"]`).check();
  await p.locator("#co-name").fill("Cliente Prueba");
  await p.locator("#co-phone").fill(o.phone);
  await p.locator("#co-email").fill("cliente@example.com");
  if (o.delivery === "delivery") {
    await p.locator("#co-postalCode").fill("28223");
    await p.locator("#co-line").fill("Calle de prueba 1");
  }
  await p.locator(`input[name="payment"][value="${o.payment}"]`).check();
};
// Stripe sirve el formulario en la propia página o dentro de un iframe según la versión.
const stripePay = async (p, card) => {
  await p.waitForURL(/checkout.stripe.com/, { timeout: 90000, waitUntil: "commit" });
  let f = null;
  for (let i = 0; i < 60 && !f; i++) {
    for (const x of p.frames()) if (await x.locator("#payment-numberInput, #cardNumber").first().isVisible().catch(() => false)) f = x;
    if (!f) await p.waitForTimeout(500);
  }
  if (!f) throw new Error("No aparece el formulario de tarjeta de Stripe");
  await f.locator("#payment-numberInput, #cardNumber").first().fill(card);
  await f.locator("#payment-expiryInput, #cardExpiry").first().fill("12 / 34");
  await f.locator("#payment-cvcInput, #cardCvc").first().fill("123");
  await f.locator("#payment-nameInput, #billingName").first().fill("Cliente Prueba");
  await f.locator('[data-testid="payment-form-submit-button"], [data-testid="hosted-payment-submit-button"]').first().click();
};

try {
  // ---------- Backoffice: acceso ----------
  const bo = await ctx();
  await bo.goto(`${BASE}/backoffice/pedidos`);
  check("Backoffice sin sesión redirige al acceso", await bo.waitForURL(/entrar$/, { timeout: 8000 }).then(() => true, () => false));
  await bo.waitForTimeout(1500);
  check("Backoffice sin cabecera ni pie de tienda", (await bo.locator(".site-footer, .main-nav").count()) === 0);
  await bo.getByLabel("Tu nombre").fill("Prueba");
  await bo.getByLabel("Contraseña del equipo").fill("incorrecta");
  await bo.getByRole("button", { name: "Entrar" }).click();
  check("Contraseña incorrecta se rechaza", await bo.getByText("Contraseña incorrecta.").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await bo.getByLabel("Tu nombre").fill("Prueba");
  await bo.getByLabel("Contraseña del equipo").fill(env.BACKOFFICE_PASSWORD);
  await bo.getByRole("button", { name: "Entrar" }).click();
  await bo.waitForURL(`${BASE}/backoffice`);
  check("Acceso correcto", true);

  // ---------- Inventario ----------
  await bo.goto(`${BASE}/backoffice/inventario?q=espátula`);
  const units = bo.getByLabel(/Unidades de Espátula/i).first();
  await units.fill("20");
  await units.locator("xpath=ancestor::form").getByRole("button").click();
  await bo.waitForTimeout(1500);
  await bo.reload();
  check("Inventario guardado", (await bo.getByLabel(/Unidades de Espátula/i).first().inputValue()) === "20");
  const stockNow = async () => {
    await bo.goto(`${BASE}/backoffice/inventario?q=espátula`);
    return Number(await bo.getByLabel(/Unidades de Espátula/i).first().inputValue());
  };

  // ---------- 1. Validación del checkout ----------
  const v = await ctx();
  await addProduct(v);
  await v.goto(`${BASE}/checkout`);
  await v.locator(".checkout-pay").click();
  await v.locator(".field-error").first().waitFor();
  check("Errores de formulario por campo", (await v.locator(".field-error").count()) >= 4, `${await v.locator(".field-error").count()} avisos`);
  check("El foco va al primer campo con error", await v.evaluate(() => document.activeElement?.id?.startsWith("co-")));
  await shot(v, "checkout-errores-1440");
  await v.locator("#co-postalCode").fill("08001");
  check("CP fuera de zona avisa", await v.getByText(/Aún no repartimos/).isVisible());
  await v.locator("#co-name").fill("X Y");
  await v.locator("#co-phone").fill(phone(0));
  await v.locator("#co-email").fill("a@example.com");
  await v.locator("#co-line").fill("Calle 1");
  await v.locator(".checkout-pay").click();
  check("CP fuera de zona no deja pagar", await v.locator("#co-postalCode-err").waitFor({ timeout: 8000 }).then(() => true, () => false));

  // ---------- 2. Pago online aprobado ----------
  const a = await ctx();
  await addProduct(a, "espatula-silicona", 2);
  await fill(a, { delivery: "delivery", payment: "online", phone: phone(1) });
  await shot(a, "checkout-1440");
  await a.locator(".checkout-pay").click();
  await stripePay(a, "4242424242424242");
  await a.waitForURL(/session_id=/, { timeout: 60000 });
  await a.getByText("Gracias por tu compra").waitFor({ timeout: 30000 });
  const refText = await a.locator(".confirmation .mono").innerText().catch(() => "");
  check("Pago aprobado: confirmación con nº de pago", /pi_|ch_/.test(refText), refText.slice(0, 6) + "…");
  await shot(a, "confirmacion-1440");
  await a.getByRole("link", { name: "Seguir mi pedido" }).first().click();
  await a.waitForURL(/\/pedido\//);
  const code1 = (await a.locator(".order-head .eyebrow").first().innerText()).match(/HP-[A-Z0-9]{6}/i)[0].toUpperCase();
  check("Seguimiento del cliente abre", true, code1);
  check("Stock descontado por la venta web", (await stockNow()) === 18);
  const url1 = a.url();

  // ---------- 3. Preparar y enviar ----------
  const open = async (code) => {
    await bo.goto(`${BASE}/backoffice/pedidos?q=${code}`);
    await bo.getByRole("link", { name: code }).click();
    await bo.waitForURL(/pedidos\/[0-9a-f-]{36}/);
  };
  const act = async (name) => {
    await bo.getByRole("button", { name }).first().click();
    await bo.waitForTimeout(1800);
  };
  await open(code1);
  check("El pago de Stripe llega verificado", await bo.getByText("Verificado").first().waitFor({ timeout: 8000 }).then(() => true, () => false));
  await act("Empezar a preparar");
  await act("Entregar al transportista");
  check("No sale sin transportista", await bo.getByText("Asigna un transportista").isVisible());
  await bo.getByLabel("Transportista").selectOption("seur");
  await act("Guardar transporte");
  await act("Entregar al transportista");
  check("No sale sin nº de seguimiento", await bo.getByText("Añade el número de seguimiento").isVisible());
  await bo.getByLabel("Transportista").selectOption("seur");
  await bo.getByLabel("Nº de seguimiento").fill(`TEST${run}`);
  await act("Guardar transporte");
  await act("Entregar al transportista");
  await shot(bo, "bo-pedido-1440");
  await a.goto(url1);
  check("El cliente ve el seguimiento", await a.getByText(`TEST${run}`).first().isVisible());
  check("El cliente ve «En reparto»", /En reparto/.test(await a.locator("h1").first().innerText()));
  await shot(a, "pedido-1440");
  await act("Marcar entregado");

  // ---------- 4. Búsqueda del pedido y desistimiento ----------
  await a.goto(`${BASE}/pedido`);
  await a.getByLabel("Código de pedido").fill(code1);
  await a.getByLabel("Email o teléfono").fill("otro@example.com");
  await a.getByRole("button", { name: "Ver mi pedido" }).click();
  check("Código con email ajeno no abre el pedido", await a.getByText(/No encontramos ese pedido/).waitFor({ timeout: 8000 }).then(() => true, () => false));
  await a.getByLabel("Email o teléfono").fill("cliente@example.com");
  await a.getByRole("button", { name: "Ver mi pedido" }).click();
  await a.waitForURL(/\/pedido\/.+/);
  await a.getByRole("button", { name: "Desistir de la compra aquí" }).click();
  await a.getByLabel("Email o teléfono").fill("cliente@example.com");
  await a.getByRole("button", { name: "Confirmar desistimiento" }).click();
  check("Desistimiento con referencia", await a.getByText(/DES-[0-9A-F]{8}/).first().waitFor({ timeout: 8000 }).then(() => true, () => false));
  await bo.goto(`${BASE}/backoffice/pedidos?vista=devoluciones`);
  check("El desistimiento llega al backoffice", await bo.getByRole("link", { name: code1 }).isVisible());

  // ---------- 5. Tarjeta rechazada y recuperación ----------
  const r = await ctx();
  await addProduct(r);
  await fill(r, { delivery: "collect", payment: "online", phone: phone(2) });
  await r.locator(".checkout-pay").click();
  await stripePay(r, "4000000000000002");
  let declined = false;
  for (let i = 0; i < 40 && !declined; i++) {
    for (const x of r.frames()) if (await x.getByText(/rechazad|denegad|declined/i).first().isVisible().catch(() => false)) declined = true;
    if (!declined) await r.waitForTimeout(500);
  }
  check("Tarjeta rechazada: Stripe avisa y no cobra", declined);
  await shot(r, "stripe-rechazo-1440");
  await r.goto(`${BASE}/checkout?canceled=1`);
  await r.locator(".checkout-error").waitFor();
  check("Al volver, la cesta sigue intacta", (await r.locator(".checkout-review-line").count()) === 1);

  // ---------- 6. 3-D Secure ----------
  const t = await ctx();
  await addProduct(t);
  await fill(t, { delivery: "collect", payment: "online", phone: phone(3) });
  await t.locator(".checkout-pay").click();
  await stripePay(t, "4000002500003155");
  let done3ds = false;
  for (let i = 0; i < 40 && !done3ds; i++) {
    for (const f of t.frames()) {
      const b = f.locator("#test-source-authorize-3ds");
      if (await b.count().catch(() => 0)) {
        await t.waitForTimeout(4000); // la pantalla del banco ignora pulsaciones mientras carga
        await b.click({ timeout: 4000 }).catch(() => {});
        done3ds = true;
        break;
      }
    }
    if (!done3ds) await t.waitForTimeout(700);
  }
  check("3-D Secure: aparece la autenticación del banco", done3ds);
  check(
    "3-D Secure: al autorizar, pedido confirmado",
    await t.getByText("Gracias por tu compra").waitFor({ timeout: 45000 }).then(() => true, () => false),
  );

  // ---------- 7. Pagar al recoger (Bizum en mostrador) ----------
  const c = await ctx(390, 844);
  await addProduct(c);
  const cPhone = phone(4);
  await fill(c, { delivery: "collect", payment: "later", phone: cPhone });
  await shot(c, "checkout-390");
  await c.locator(".checkout-pay").click();
  await c.waitForURL(/\/pedido\/.+nuevo=1/, { timeout: 20000 });
  const code2 = (await c.locator(".order-head .eyebrow").first().innerText()).match(/HP-[A-Z0-9]{6}/i)[0].toUpperCase();
  check("Pagar al recoger: pedido creado con QR", await c.locator(".order-qr svg").first().isVisible(), code2);
  await shot(c, "pedido-recogida-390");
  check("Sin scroll horizontal a 390", await c.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await bo.goto(`${BASE}/backoffice/tpv`);
  await bo.getByLabel("Código del QR").fill(code2);
  await bo.getByRole("button", { name: "Entregar pedido web" }).click();
  await bo.waitForURL(/pedidos\/[0-9a-f-]{36}/);
  check("El QR abre el pedido desde el TPV", true);
  await act("Empezar a preparar");
  await act("Marcar listo para recoger");
  await act("Marcar entregado");
  check("No se entrega sin cobrar", await bo.getByText("No se entrega sin cobrar").isVisible());
  await bo.getByLabel("Cómo ha pagado").first().selectOption("bizum");
  await act(/Registrar cobro/);
  check("Bizum exige nº de operación", await bo.getByText("Falta el número de operación").isVisible());
  await bo.getByLabel("Cómo ha pagado").first().selectOption("bizum");
  await bo.getByLabel("Nº de operación").first().fill(`BZ-${run}`);
  await act(/Registrar cobro/);
  await act("Verificar");
  await act("Marcar entregado");
  check("Cobro por Bizum verificado y entregado", await bo.getByText("Pedido cerrado.").isVisible().catch(() => false) || (await bo.locator('.bo-pill[data-s="delivered"]').count()) > 0);

  // ---------- 8. Contra reembolso ----------
  const d = await ctx();
  await addProduct(d);
  await fill(d, { delivery: "delivery", payment: "later", phone: phone(5) });
  await d.locator(".checkout-pay").click();
  await d.waitForURL(/\/pedido\/.+nuevo=1/, { timeout: 20000 });
  const code3 = (await d.locator(".order-head .eyebrow").first().innerText()).match(/HP-[A-Z0-9]{6}/i)[0].toUpperCase();
  await open(code3);
  await act("Empezar a preparar");
  await bo.getByLabel("Transportista").selectOption("propio");
  await act("Guardar transporte");
  await act("Entregar al transportista");
  await act("Marcar entregado");
  check("Contra reembolso: no se entrega sin cobro", await bo.getByText(/registra el cobro del repartidor/).isVisible());
  await bo.getByLabel("Cómo ha pagado").first().selectOption("card");
  await bo.getByLabel("Nº de operación").first().fill(`BZ-${run}`);
  await act(/Registrar cobro/);
  const dupOther = await bo.getByText("Queda por verificar").isVisible().catch(() => false);
  check("Contra reembolso: cobro con datáfono registrado", dupOther || (await bo.getByRole("button", { name: "Verificar" }).count()) > 0);
  await act("Rechazar");
  check("Cobro rechazado vuelve a «por cobrar» y pide revisión", await bo.getByText("Cobro rechazado en la verificación").first().isVisible());
  await bo.getByLabel("Cómo ha pagado").first().selectOption("cash");
  await act(/Registrar cobro/);
  await act("Marcar entregado");
  await act("Verificar");
  check("Contra reembolso entregado y verificado", (await bo.locator('.bo-pill[data-s="delivered"]').count()) > 0);

  // ---------- 9. TPV ----------
  const before = await stockNow();
  await bo.goto(`${BASE}/backoffice/tpv`);
  await bo.getByLabel("Buscar producto").fill("espátula");
  await bo.locator(".pos-grid button").first().click();
  await bo.locator(".pos-grid button").first().click();
  await bo.locator(".pos-go").click();
  check("TPV: tarjeta exige nº de operación", await bo.getByText("Falta el número de operación").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await bo.getByRole("radio", { name: "Efectivo" }).click();
  await bo.getByLabel(/Entregado/).fill("1");
  check("TPV: avisa de lo que falta en efectivo", (await bo.getByText(/Faltan/).isVisible()) && (await bo.locator(".pos-go").isDisabled()));
  await bo.getByLabel(/Entregado/).fill("5");
  await shot(bo, "bo-tpv-1440");
  await bo.locator(".pos-go").click();
  check("TPV: venta cobrada con cambio", await bo.getByText(/Cambio: 3,02/).last().waitFor({ timeout: 8000 }).then(() => true, () => false));
  check("TPV: stock descontado", (await stockNow()) === before - 2, `${before} → ${before - 2}`);

  // ---------- 10. Falta de stock: ya estaba en la cesta ----------
  const s = await ctx();
  await addProduct(s);
  await bo.goto(`${BASE}/backoffice/inventario?q=espátula`);
  await bo.getByLabel(/Unidades de Espátula/i).first().fill("0");
  await bo.getByLabel(/Unidades de Espátula/i).first().locator("xpath=ancestor::form").getByRole("button").click();
  await bo.waitForTimeout(1200);
  const s0 = await ctx();
  await s0.goto(`${BASE}/product/espatula-silicona`);
  check("La ficha marca «Agotado» y no deja comprar", await s0.locator(".add-main:disabled", { hasText: "Agotado" }).waitFor({ timeout: 8000 }).then(() => true, () => false));
  await fill(s, { delivery: "collect", payment: "online", phone: phone(6) });
  await s.locator(".checkout-pay").click();
  check("Sin stock no se puede pagar", await s.getByText(/No quedan unidades suficientes/).waitFor({ timeout: 10000 }).then(() => true, () => false));

  await bo.goto(`${BASE}/backoffice/inventario?q=espátula`);
  await bo.getByLabel(/Unidades de Espátula/i).first().fill("20");
  await bo.getByLabel(/Unidades de Espátula/i).first().locator("xpath=ancestor::form").getByRole("button").click();
  await bo.waitForTimeout(1200);

  // ---------- 11. KPIs ----------
  await bo.goto(`${BASE}/backoffice`);
  await bo.waitForTimeout(500);
  console.log((await bo.locator(".bo-kpis").innerText()).replace(/\n+/g, " | "));
  console.log((await bo.locator(".bo-funnel").innerText()).replace(/\n+/g, " | "));
  await shot(bo, "bo-resumen-1440");
  await bo.goto(`${BASE}/backoffice/pedidos`);
  await shot(bo, "bo-pedidos-1440");
  for (const [n, w, h] of [["390", 390, 844]]) {
    await bo.setViewportSize({ width: w, height: h });
    for (const [k, u] of [["resumen", ""], ["pedidos", "/pedidos"], ["tpv", "/tpv"], ["inventario", "/inventario?q=espátula"], ["suscripciones", "/suscripciones"]]) {
      await bo.goto(`${BASE}/backoffice${u}`);
      check(`Backoffice ${k} sin scroll horizontal a ${n}`, await bo.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await shot(bo, `bo-${k}-${n}`);
    }
  }
  for (const [n, p] of Object.entries({ bo, v, a, r, t, c, d, s })) {
    const own = p.errors.filter((e) => !/stripe\.com|stripe\.network|hcaptcha|status of 4(22|09)|status of 404.*lookup|ERR_|favicon/.test(e));
    check(`Consola limpia (${n})`, own.length === 0, own.slice(0, 2).join(" · ").slice(0, 240));
  }
} catch (e) {
  check("Recorrido sin interrupciones", false, e.message.split("\n").slice(0, 3).join(" "));
  for (const [i, c] of browser.contexts().entries()) for (const p of c.pages()) await p.screenshot({ path: `${OUT}/zz-fallo-${i}.png` }).catch(() => {});
}
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
process.exit(results.every(Boolean) ? 0 : 1);
