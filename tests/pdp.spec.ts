import AxeBuilder from "@axe-core/playwright";
import { test, expect, settle } from "./support";

test("pack: 19,41 €, con Limpieza S faltan 1,64 € para el envío gratis", async ({ page }) => {
  await page.goto("/packs/kitchen/medium");
  await expect(page.locator(".pack-summary-price")).toContainText("19,41");
  await page.locator(".pdp-panel .add-main").click();
  await page.keyboard.press("Escape");
  await page.locator(".pdp-rail-card", { hasText: "Pack Limpieza" }).getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("28,36");
  await page.keyboard.press("Escape");
  await expect(page.locator(".pdp-ship-progress")).toContainText("1,64");
});

test("pack sin tocar es pack; modificado es pack a medida con el precio recalculado", async ({ page }) => {
  await page.goto("/packs/kitchen/small");
  const first = page.locator(".pdp-contents li").first();
  await first.getByRole("button", { name: /añadir uno/i }).click();
  await expect(page.locator(".pack-summary-price")).toContainText("8,94");
  await page.locator(".pdp-panel .add-main").click();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("hp-shared-cart") || "[]"));
  expect(cart[0].type).toBe("custom_bundle");
  await expect(page.getByRole("dialog")).toContainText("8,94");
});

test("pack vacío: botón deshabilitado con el motivo, y se puede volver al original", async ({ page }) => {
  await page.goto("/packs/cleaning/small");
  for (const b of await page.locator(".pdp-contents").getByRole("button", { name: /quitar uno/i }).all()) void b;
  while (await page.locator(".pdp-contents").getByRole("button", { name: /quitar uno/i }).count())
    await page.locator(".pdp-contents").getByRole("button", { name: /quitar uno/i }).first().click();
  const cta = page.locator(".pdp-panel .add-main");
  await expect(cta).toBeDisabled();
  await expect(cta).toContainText("Elige al menos un artículo");
  await page.getByRole("button", { name: "Pack original" }).click();
  await expect(cta).toBeEnabled();
  await expect(page.locator(".pack-summary-price")).toContainText("8,95");
});

test("agotado solo con inventario en 0: sale de la selección y el pack pasa a medida", async ({ page }) => {
  await page.route("**/api/availability", (r) => r.fulfill({ json: { soldOut: ["HP-KIT-001"] } }));
  await page.goto("/packs/kitchen/small");
  await expect(page.locator(".pdp-contents em")).toHaveText("Agotado");
  await expect(page.locator(".pack-summary-price")).toContainText("6,96");
  await page.goto("/product/espatula-silicona");
  await expect(page.locator(".pdp-panel .add-main")).toBeDisabled();
});

test("galería: una imagen o tile no lleva flechas; varias sí", async ({ page, isMobile }) => {
  await page.goto("/product/espatula-silicona");
  await expect(page.locator(".pdp-gallery-tile")).toBeVisible();
  await expect(page.locator(".pdp-arrow, .pdp-dots")).toHaveCount(0);
  await page.goto("/packs/bathroom/small");
  await expect(page.locator(".pdp-dots")).toBeVisible();
  if (isMobile) return;
  await page.getByRole("button", { name: "Imagen siguiente" }).click();
  await expect(page.getByRole("button", { name: "Imagen siguiente" })).toBeDisabled();
});

test("barra de compra: sale al perder de vista el panel y no tapa el final", async ({ page, isMobile }) => {
  await page.goto("/product/espatula-silicona");
  await settle(page);
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect(page.locator(".sticky-buy.is-visible")).toBeVisible();
  if (isMobile) {
    const last = await page.locator("footer a").last().boundingBox();
    const bar = await page.locator(".sticky-buy").boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(bar!.y + 1);
  }
});

for (const url of ["/product/esponjas-limpieza-pack-3", "/packs/kitchen/medium"])
  test(`axe ficha ${url}`, async ({ page }) => {
    await page.goto(url);
    await settle(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => `${v.id}: ${v.nodes[0].html}`)).toEqual([]);
  });
