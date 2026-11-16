import { test, expect } from "./support";

test.skip(({ isMobile }) => isMobile, "teclado: escritorio");

test("skip-link es lo primero y lleva al contenido", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const first = page.locator(":focus");
  await expect(first).toHaveText(/saltar al contenido/i);
  await expect(first).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content/);
});

test("todo foco es visible (outline o box-shadow) en los primeros 25 tabs", async ({ page }) => {
  await page.goto("/");
  const invisible: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== "none");
      return { ring, name: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}"` };
    });
    if (info && !info.ring) invisible.push(info.name);
  }
  expect(invisible).toEqual([]);
});

test("drawer de cesta: foco atrapado y devuelto al cerrar", async ({ page }) => {
  await page.goto("/product/espatula-silicona");
  const add = page.locator(".add-main");
  await add.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside, `tab ${i} se escapó del diálogo`).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
});

test("menú de categorías: se abre con teclado y Escape devuelve el foco", async ({ page }) => {
  await page.goto("/");
  const btn = page.getByRole("button", { name: /categorías/i });
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", /\/category\//);
  await page.keyboard.press("Escape");
  await expect(btn).toBeFocused();
  await expect(btn).toHaveAttribute("aria-expanded", "false");
});

test("reduced motion: sin animaciones largas", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("hp-cookies-ack", "1"));
  await page.goto("/");
  const long = await page.evaluate(() =>
    document.getAnimations().filter((a) => {
      const t = a.effect?.getTiming();
      return t && (t.iterations === Infinity || Number(t.duration) > 300);
    }).length,
  );
  expect(long).toBe(0);
  await ctx.close();
});
