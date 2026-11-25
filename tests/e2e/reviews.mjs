// Reseñas: quién puede opinar (contra la API), moderación, pedidos de prueba y JSON-LD. Uso: node tests/e2e/reviews.mjs [carpeta]
import fs from "node:fs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE, Client, check, env, lab, product, results } from "./lab.mjs";

const OUT = process.argv[2] || "test-results/fase4";
fs.mkdirSync(OUT, { recursive: true });
const L = lab("pg-reviews");
const seed = JSON.parse(fs.readFileSync("src/data/seed/hiper-pozuelo-catalogo-estimado.json", "utf8"));
const bundle = seed.bundles.find((b) => b.category_id === "kitchen" && b.tier === "small");
const slug = (id) => seed.products.find((p) => p.id === id).slug;
const KIT = bundle.product_ids[0];
const inPack = bundle.product_ids[1];
try {
  await L.start();
  const ana = await new Client().signup("ana@example.com");
  const bea = await new Client().signup("bea@example.com", undefined, "Bea López");
  const dan = await new Client().signup("dan@example.com", undefined, "Dan");
  const eva = await new Client().signup("eva@example.com");
  const guest = new Client();
  const bundleLine = { type: "bundle", bundleId: bundle.id, quantity: 1 };
  const o1 = await ana.order([product(KIT), bundleLine]);
  const o2 = await ana.order([product("HP-CLE-001", 3)]);
  const o3 = await ana.order([product("HP-CLE-003")]);
  const o4 = await ana.order([product("HP-CLE-004")]);
  const o5 = await bea.order([product(KIT)]);
  const o6 = await dan.order([product(KIT)]);
  const o7 = await guest.order([product(KIT)]);
  const o8 = await ana.order([product("HP-CLE-006")]);
  await L.sql(async (q) => {
    const set = (o, status, days, test) => q(`update orders set status=$2, payment_status='verified', test=$4, delivered_at=case when $3::int is null then null else ((now() at time zone 'Europe/Madrid')::date - $3::int + time '12:00') at time zone 'Europe/Madrid' end where code=$1`, [o.code, status, days, !test]);
    await set(o1, "delivered", 2, false);
    await set(o2, "ready", null, false);
    await set(o3, "delivered", 31, false);
    await set(o4, "delivered", 30, false);
    await set(o5, "delivered", 1, true);
    await set(o6, "delivered", 5, false);
    await set(o7, "delivered", 3, false);
    await set(o8, "returned", 4, false);
  });
  const page = async (id) => (await new Client().req("GET", `/product/${slug(id)}`)).text;
  const post = (c, b) => c.req("POST", "/api/reviews", { action: "create", type: "product", rating: 5, text: "", name: "Ana G.", ...b });
  const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "");

  let html = await page(KIT);
  check("Sin reseñas: ni estrellas ni aggregateRating", !html.includes("aggregateRating") && !text(html).includes("rv-stars") && html.includes("Aún no hay reseñas") && html.includes("Sé el primero en opinar"));
  check("Texto de verificación visible", text(html).includes("Solo opina quien lo ha comprado aquí"));

  check("Sin sesión: 401", (await post(new Client(), { id: KIT })).status === 401);
  check("Quien no compró: 403", (await post(eva, { id: KIT })).status === 403);
  check("Pedido sin entregar: 403", (await post(ana, { id: "HP-CLE-001" })).status === 403);
  check("Fuera de plazo, 31 días: 403", (await post(ana, { id: "HP-CLE-003" })).status === 403);
  check("Último día, 30: se acepta", (await post(ana, { id: "HP-CLE-004" })).status === 200);
  check("Pedido devuelto: 403", (await post(ana, { id: "HP-CLE-006" })).status === 403);
  check("Pack no comprado: 403", (await post(bea, { type: "bundle", id: bundle.id })).status === 403);
  check("Artículo inexistente: 404", (await post(ana, { id: "nada" })).status === 404);
  check("Otro origen: 403", (await ana.req("POST", "/api/reviews", { action: "create" }, { origin: "https://malo.example" })).status === 403);
  check("0 y 6 estrellas: 422", (await post(ana, { id: KIT, rating: 0 })).status === 422 && (await post(ana, { id: KIT, rating: 6 })).status === 422);
  check("Texto de 1.001 caracteres: 422", (await post(ana, { id: KIT, text: "a".repeat(1001) })).status === 422);
  check("Nombre público con email: 422", (await post(ana, { id: KIT, name: "ana@example.com" })).status === 422);

  check("Compra entregada: se publica", (await post(ana, { id: KIT, rating: 5, text: 'Muy útil. <script>alert(1)</script> https://enlace.example' })).status === 200);
  const again = await post(ana, { id: KIT });
  check("Segunda vez: permitida solo si hay otro pedido sin reseñar", again.status === 403);
  check("Pack: reseña del pack", (await post(ana, { type: "bundle", id: bundle.id, rating: 4, name: "Ana G." })).status === 200);
  check("Producto comprado dentro del pack", (await post(ana, { id: inPack, rating: 4 })).status === 200);
  check("Dos a la vez: solo entra una", (await Promise.all([post(dan, { id: KIT, rating: 2, name: "Dan", text: "Se dobla." }), post(dan, { id: KIT, rating: 2, name: "Dan" })])).filter((r) => r.status === 200).length === 1);
  check("Pedido del otro modo de pago: se guarda", (await post(bea, { id: KIT, rating: 1, name: "Bea L.", text: "Reseña de prueba" })).status === 200);
  html = await page(KIT);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/)[1]);
  check("Media 3,5 con 2 reseñas (la del otro modo no cuenta)", ld.aggregateRating?.ratingValue === 3.5 && ld.aggregateRating.reviewCount === 2, JSON.stringify(ld.aggregateRating));
  check("La del otro modo no es pública", !html.includes("Reseña de prueba") && !html.includes("Bea L."));
  check("Texto escapado y sin enlaces activos", !html.includes("<script>alert(1)") && !html.includes('href="https://enlace.example'));
  check("Sale «Compra verificada»", text(html).includes("Compra verificada"));
  const own = (await bea.req("GET", `/api/reviews?type=product&id=${KIT}`)).json;
  check("Su autora sí la ve", own.mine.length === 1);
  check("Otra cuenta no la ve", (await eva.req("GET", `/api/reviews?type=product&id=${KIT}`)).json.mine.length === 0);
  const packPage = (await new Client().req("GET", `/packs/kitchen/small`)).text;
  check("Pack con aggregateRating propio", /"aggregateRating".*"ratingValue":4/.test(packPage));

  // Invitado → cuenta → vincular → opinar
  await guest.signup("gil@example.com", undefined, "Gil Pérez");
  check("Invitado con cuenta pero sin vincular: 403", (await post(guest, { id: KIT, name: "Gil P." })).status === 403);
  await guest.acc("link", { code: o7.code, contact: o7.phone });
  const acc = (await guest.req("GET", "/account")).text;
  check("Tras vincular, aparece en reseñas pendientes", acc.includes("Reseñas pendientes"));
  check("Y puede opinar", (await post(guest, { id: KIT, rating: 4, name: "Gil P." })).status === 200);

  // Edición y borrado
  const mine = (await ana.req("GET", `/api/reviews?type=product&id=${KIT}`)).json.mine[0];
  check("Otra cuenta no edita ni borra", (await eva.req("POST", "/api/reviews", { action: "edit", review: mine.id, rating: 1, name: "Eva" })).status === 404 && (await eva.req("POST", "/api/reviews", { action: "delete", review: mine.id })).status === 404);
  check("Su autora la edita", (await ana.req("POST", "/api/reviews", { action: "edit", review: mine.id, rating: 3, name: "Ana G.", text: "Editada" })).status === 200 && (await page(KIT)).includes("Editada"));
  const exp = (await ana.req("GET", "/api/account/export")).json;
  check("Exportar incluye sus reseñas", exp.resenas.length === 4, String(exp.resenas.length));

  // ---------- Pantalla y moderación ----------
  const browser = await chromium.launch({ channel: "chrome" });
  const errors = [];
  const open = async (width, jar = {}) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-ES", reducedMotion: "reduce" });
    await ctx.addCookies(Object.entries(jar).map(([name, value]) => ({ name, value, url: BASE })));
    await ctx.addInitScript((on) => {
      localStorage.setItem("hp-cookies-ack", "1");
      localStorage.setItem("hp-welcome-closed-at", String(Date.now()));
      sessionStorage.setItem("hp-intro-seen", "1");
      if (on) localStorage.setItem("hp-account", "1");
    }, Boolean(jar.hp_customer));
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => m.type() === "error" && errors.push(`${m.text()} ${m.location().url}`));
    return p;
  };
  const look = async (p, name, width, scope = "main") => {
    await p.waitForLoadState("networkidle").catch(() => {});
    await p.waitForTimeout(700);
    const m = await p.evaluate((scope) => ({
      over: document.documentElement.scrollWidth - innerWidth,
      small: [...document.querySelectorAll(`${scope} .rv button, ${scope} .rv select, ${scope} .rv input, ${scope} .rv textarea, ${scope} .rv-link`)].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 43.5).map((e) => e.outerHTML.slice(0, 60)),
    }), scope);
    const bad = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze()).violations.filter((v) => ["serious", "critical", "moderate"].includes(v.impact));
    check(`${name} ${width}: axe, sin desborde, ≥44 px`, !bad.length && m.over <= 0 && !m.small.length, JSON.stringify({ axe: bad.map((v) => [v.id, v.nodes[0].target]), ...m }));
    await p.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });
  };
  for (const width of [1440, 390]) {
    let p = await open(width);
    await p.goto(`${BASE}/product/${slug(KIT)}`);
    await look(p, "ficha-con-resenas", width);
    await p.locator("#rv-sort").selectOption("low");
    check(`${width}: ordenar por peor valoradas`, /Dan/.test(await p.locator(".rv-item").first().innerText()));
    check(`${width}: distribución por estrellas`, (await p.locator(".rv-dist li").count()) === 5);
    await p.locator(".rv-link").click();
    await p.waitForTimeout(800);
    check(`${width}: la nota lleva a la sección`, p.url().endsWith("#resenas"));
    await p.goto(`${BASE}/product/${slug("HP-CLE-001")}`);
    await look(p, "ficha-sin-resenas", width);
    await p.goto(`${BASE}/packs/kitchen/small`);
    await look(p, "pack-con-resenas", width);
    await p.context().close();
    p = await open(width, bea.jar);
    await p.goto(`${BASE}/product/${slug(KIT)}`);
    await p.getByRole("button", { name: "Editar mi reseña" }).first().waitFor();
    await look(p, "ficha-autora-prueba", width);
    await p.context().close();
    p = await open(width, dan.jar);
    await p.goto(`${BASE}/account`);
    await look(p, "cuenta-dan", width);
    await p.context().close();
  }
  // Formulario en pantalla, con teclado
  const pend = await open(390, ana.jar);
  await pend.goto(`${BASE}/account`);
  const opinar = pend.getByRole("link", { name: "Opinar" }).first();
  await opinar.click();
  await pend.locator(".rv-form").waitFor();
  check("Nombre por defecto: nombre e inicial", (await pend.locator("#rv-name").inputValue()) === "Ana G.");
  await look(pend, "formulario", 390);
  await pend.locator('.rv-rate input[value="1"]').focus();
  for (let i = 0; i < 3; i++) await pend.keyboard.press("ArrowRight");
  await pend.locator("#rv-text").fill("Escrita desde la ficha");
  await pend.getByRole("button", { name: "Publicar reseña" }).click();
  await pend.getByText("Tu reseña está guardada").waitFor();
  check("Publicar desde la ficha", await pend.getByText("Escrita desde la ficha").isVisible());

  const bo = await open(1440);
  await bo.goto(`${BASE}/backoffice/entrar`);
  await bo.getByLabel("Tu nombre").fill("Prueba");
  await bo.getByLabel("Contraseña del equipo").fill(env.BACKOFFICE_PASSWORD);
  await bo.getByRole("button", { name: "Entrar" }).click();
  await bo.waitForURL(`${BASE}/backoffice`);
  await bo.goto(`${BASE}/backoffice/resenas`);
  const row = bo.locator("tr", { hasText: "Se dobla." });
  check("Backoffice las ve todas", (await bo.locator("tr", { hasText: "Bea L." }).count()) === 1);
  await row.getByRole("button", { name: "Retirar" }).click();
  check("Retirar sin motivo: no deja", await row.getByText("Elige uno de los motivos permitidos.").waitFor({ timeout: 8000 }).then(() => true, () => false));
  check("Motivos permitidos: solo cuatro", (await row.locator("select option:not([disabled])").allInnerTexts()).join() === "Spam,Insultos,Datos personales,Contenido ilegal");
  await row.getByLabel("Respuesta pública").fill("Gracias, Dan. Pásate y lo cambiamos.");
  await row.getByRole("button", { name: "Guardar respuesta" }).click();
  await bo.waitForTimeout(2500);
  check("Respuesta pública visible", (await page(KIT)).includes("Pásate y lo cambiamos"));
  await bo.screenshot({ path: `${OUT}/backoffice-resenas-1440.png`, fullPage: true });
  const row2 = bo.locator("tr", { hasText: "Se dobla." });
  await row2.locator("select").selectOption("personal");
  await row2.getByLabel("Qué incumple").fill("Contiene un teléfono");
  await row2.getByRole("button", { name: "Retirar" }).click();
  await bo.locator("tr", { hasText: "Contiene un teléfono (Prueba" }).waitFor({ timeout: 10000 });
  html = await page(KIT);
  check("Retirada: sale de público y de la media", !html.includes("Se dobla.") && /"reviewCount":2/.test(html));
  const dm = (await dan.req("GET", `/api/reviews?type=product&id=${KIT}`)).json;
  check("Su autor ve el motivo y no puede repetirla", dm.mine[0].reason === "Datos personales" && dm.canReview === null && (await post(dan, { id: KIT, name: "Dan" })).status === 403);
  check("Su autor no la edita retirada", (await dan.req("POST", "/api/reviews", { action: "edit", review: dm.mine[0].id, rating: 5, name: "Dan" })).status === 404);
  await bo.setViewportSize({ width: 390, height: 844 });
  await bo.goto(`${BASE}/backoffice/resenas`);
  check("Backoffice sin scroll horizontal a 390", await bo.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await browser.close();
  check("Consola limpia", !errors.length, errors.slice(0, 3).join(" | "));

  // Borrado de cuentas: se van sus reseñas, y de paso la caché del build queda como estaba.
  for (const c of [ana, bea, dan, guest]) await c.acc("delete", { password: "contraseña-de-prueba" });
  html = await page(KIT);
  check("Al eliminar la cuenta desaparecen sus reseñas", !html.includes("aggregateRating") && html.includes("Aún no hay reseñas"));
  for (const id of [KIT, inPack, "HP-CLE-004"]) await page(id);
} catch (e) {
  check("Recorrido sin interrupciones", false, e.stack.split("\n").slice(0, 4).join(" "));
}
await L.clean();
console.log(`\n${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
