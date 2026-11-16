import { test, expect, ROUTES, FORBIDDEN_TEXT, settle } from "./support";

for (const route of ROUTES) {
  test(`smoke ${route}`, async ({ page, errors }) => {
    const res = await page.goto(route);
    expect(res?.status(), "HTTP").toBeLessThan(400);
    await settle(page);

    await expect(page.locator("h1"), "exactamente un h1").toHaveCount(1);
    const title = await page.title();
    expect(title.length, "title").toBeGreaterThan(0);
    expect(await page.locator("main#main-content, #main-content").count(), "destino del skip-link").toBeGreaterThan(0);

    const body = await page.locator("body").innerText();
    for (const re of FORBIDDEN_TEXT) expect(body, `texto prohibido ${re}`).not.toMatch(re);

    expect(errors, "errores de consola/red").toEqual([]);
  });
}

test("cada ruta tiene un <title> propio", async ({ page }) => {
  const titles = new Map<string, string>();
  for (const route of ROUTES) {
    await page.goto(route);
    titles.set(route, await page.title());
  }
  const generic = [...titles].filter(([, t]) => t === "Hiper Pozuelo").map(([r]) => r);
  expect(generic, "rutas con title genérico").toEqual([]);
});

test("404 con página propia", async ({ page }) => {
  const res = await page.goto("/esta-ruta-no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /tienda|inicio|volver/i }).first()).toBeVisible();
});

test("API checkout: POST mal formado → 400/503, nunca 500", async ({ request }) => {
  for (const data of ["no-json", JSON.stringify({}), JSON.stringify({ lines: [{ type: "product", productId: "x" }] })]) {
    const r = await request.post("/api/checkout", { data, headers: { "content-type": "application/json" } });
    expect([400, 503]).toContain(r.status());
  }
  const r = await request.get("/api/checkout?session_id=cs_test_inexistente");
  expect(r.status()).toBe(404);
});

test("cabeceras de seguridad", async ({ request }) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["x-frame-options"] || h["content-security-policy"]).toBeTruthy();
  expect(h["x-powered-by"], "no exponer x-powered-by").toBeUndefined();
});

test("sitemap y robots", async ({ request }) => {
  const s = await request.get("/sitemap.xml");
  expect(s.status()).toBe(200);
  const xml = await s.text();
  expect(xml).toContain("/product/");
  expect((await request.get("/robots.txt")).status()).toBe(200);
});
