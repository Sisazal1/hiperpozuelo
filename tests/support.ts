import { test as base, expect, type Page } from "@playwright/test";

export const ROUTES = [
  "/",
  "/shop",
  "/packs",
  "/packs/kitchen/small",
  "/category/kitchen",
  "/product/espatula-silicona",
  "/build-pack",
  "/cart",
  "/checkout",
  "/favorites",
  "/account",
  "/pedido",
  "/pago-seguro",
  "/backoffice/entrar",
  "/faq",
  "/contacto",
  "/envios-y-devoluciones",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/condiciones",
] as const;

// Textos que nunca deben verse en la tienda (AGENTS.md + reglas de confianza).
export const FORBIDDEN_TEXT = [/imagen pendiente/i, /\borientativ[oa]\b/i, /\bdemo\b/i, /pendiente de/i, /pendientes de/i];

/** Estado "cliente que vuelve": cookies aceptadas y popup de bienvenida ya cerrado. */
export async function quietVisitor(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("hp-cookies-ack", "1");
      localStorage.setItem("hp-welcome-closed-at", String(Date.now()));
    } catch {}
  });
}

type Fixtures = { quiet: void; errors: string[] };

export const test = base.extend<Fixtures>({
  quiet: [async ({ page }, use) => { await quietVisitor(page); await use(); }, { auto: true }],
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("/api/checkout")) errors.push(`${r.status()} ${r.url()}`);
    });
    await use(errors);
  },
});

export { expect };

export async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
}
