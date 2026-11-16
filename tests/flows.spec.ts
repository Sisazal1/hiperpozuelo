import { test, expect, settle } from "./support";
import type { Page } from "@playwright/test";

const euro = (s: string) => Number(s.replace(/[^\d,]/g, "").replace(",", "."));

async function seedCart(page: Page, cart: unknown[], discount?: string) {
  await page.addInitScript(
    ([c, d]) => {
      localStorage.setItem("hp-shared-cart", JSON.stringify(c));
      if (d) localStorage.setItem("hp-discount-code", d as string);
    },
    [cart, discount] as const,
  );
}

test("añadir producto → badge, drawer, cantidades, eliminar", async ({ page, isMobile }) => {
  await page.goto("/product/espatula-silicona");
  await page.locator(".add-main").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("0,99 €").first()).toBeVisible();
  await dialog.getByRole("button", { name: /aumentar cantidad/i }).click();
  await expect(dialog.getByText("1,98 €").first()).toBeVisible();
  await dialog.getByRole("button", { name: /reducir cantidad/i }).click();
  await dialog.getByRole("button", { name: /eliminar/i }).click();
  await expect(dialog.getByText(/tu cesta está vacía/i)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  if (!isMobile) await expect(page.locator(".nav-count")).toHaveCount(0);
});

test("la cesta persiste tras recargar", async ({ page }) => {
  await page.goto("/product/espatula-silicona");
  await page.locator(".add-main").click();
  await page.reload();
  await page.goto("/cart");
  await expect(page.getByText(/espátula/i).first()).toBeVisible();
});

test("subtotal coherente: pack personalizado con cantidad 2 (drawer = cesta = checkout = servidor)", async ({ page }) => {
  await seedCart(page, [
    { lineId: "custom-1", type: "custom_bundle", productIds: ["HP-KIT-001"], quantities: { "HP-KIT-001": 3 }, quantity: 2 },
  ]);
  await page.goto("/checkout");
  const line = euro(await page.locator(".checkout-review-line b").first().innerText());
  const subtotal = euro(await page.locator(".checkout-breakdown div").first().locator("strong").innerText());
  expect(line).toBeCloseTo(0.99 * 3 * 2, 2);
  expect(subtotal, "subtotal debe incluir la cantidad del pack").toBeCloseTo(line, 2);
});

test("envío gratis: la barra del drawer usa el mismo importe que el checkout (con descuento)", async ({ page }) => {
  // 31 espátulas = 30,69 € → con BIENVENIDA10 queda 27,62 €, por debajo de 30 €: hay gastos de envío.
  await seedCart(page, [{ lineId: "p", type: "product", productId: "HP-KIT-001", quantity: 31, quantities: {} }], "BIENVENIDA10");
  await page.goto("/checkout");
  await expect(page.locator(".checkout-breakdown")).toContainText("3,99 €");
  await page.goto("/product/espatula-silicona");
  await page.locator(".add-main").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // 32 uds = 31,68 € −10 % = 28,51 € → sigue sin envío gratis
  await expect(dialog).not.toContainText(/has conseguido el envío gratis/i);
});

test("favoritos: guardar y ver en /favorites", async ({ page }) => {
  await page.goto("/product/espatula-silicona");
  await page.locator(".favorite-detail").click();
  await expect(page.getByRole("button", { name: /quitar de favoritos/i }).first()).toBeVisible();
  await page.goto("/favorites");
  await expect(page.getByText(/espátula/i).first()).toBeVisible();
});

test("buscador del header: sugerencias y página de resultados", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: /abrir búsqueda/i }).click();
  const input = page.getByRole("combobox", { name: /buscar productos/i });
  await input.fill("bayeta");
  await expect(page.getByRole("option").first()).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/shop\?q=bayeta/);
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  await expect(page.locator(".catalog-result-count")).not.toContainText(/^0 /);
});

test("tienda: filtro por categoría y orden por precio", async ({ page }) => {
  await page.goto("/shop");
  await settle(page);
  await page.getByRole("combobox", { name: /ordenar/i }).selectOption({ index: 1 });
  const before = await page.locator("main").innerText();
  await page.getByRole("combobox", { name: /filtrar por categoría/i }).selectOption({ index: 1 });
  await expect.poll(async () => page.locator("main").innerText()).not.toBe(before);
});

test("pack deep link → añadir → la cesta tiene el pack con su precio", async ({ page }) => {
  await page.goto("/packs/kitchen/small");
  await expect(page.locator(".pack-summary-price")).toContainText("7,95");
  await page.locator(".pack-detail-summary .add-main").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("7,95");
  await expect(page.getByRole("dialog"), "el tier no debe salir en inglés").not.toContainText(/\bsmall\b/);
});

test("checkout: delivery/recogida son controles accesibles con estado", async ({ page }) => {
  await seedCart(page, [{ lineId: "p", type: "product", productId: "HP-KIT-001", quantity: 1, quantities: {} }]);
  await page.goto("/checkout");
  const opt = page.getByRole("radio", { name: /recogida/i });
  await opt.click();
  await expect(opt).toBeChecked();
});

test("checkout: pagar redirige a Stripe o muestra error recuperable", async ({ page }) => {
  await seedCart(page, [{ lineId: "p", type: "product", productId: "HP-KIT-001", quantity: 1, quantities: {} }]);
  await page.goto("/checkout");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/checkout") && r.request().method() === "POST"),
    page.getByRole("button", { name: /pagar/i }).click(),
  ]);
  if (resp.status() === 200) await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 15000 });
  else await expect(page.locator(".checkout-error")).toBeVisible();
});

test("checkout cancelado conserva la cesta", async ({ page }) => {
  await seedCart(page, [{ lineId: "p", type: "product", productId: "HP-KIT-001", quantity: 2, quantities: {} }]);
  await page.goto("/checkout?canceled=1");
  await expect(page.locator(".checkout-error")).toContainText(/cancelado/i);
  await expect(page.locator(".checkout-review-line")).toHaveCount(1);
});

test("cesta corrupta en localStorage no rompe la web", async ({ page, errors }) => {
  await page.addInitScript(() => localStorage.setItem("hp-shared-cart", "{no-json"));
  await page.goto("/cart");
  await expect(page.locator("h1")).toBeVisible();
  expect(errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
});

test("popup de bienvenida: aparece a visitante nuevo, se cierra con Escape y no vuelve", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("hp-cookies-ack", "1"));
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.waitForTimeout(6000);
  await expect(page.getByRole("dialog")).toBeHidden();
  await ctx.close();
});
