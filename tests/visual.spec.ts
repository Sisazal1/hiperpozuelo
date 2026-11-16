import { test, settle } from "./support";

const SHOTS = ["/", "/shop", "/packs", "/packs/kitchen/small", "/category/kitchen", "/product/espatula-silicona", "/build-pack", "/cart", "/favorites", "/faq"];
const label = process.env.SHOT_LABEL || "now";

for (const route of SHOTS) {
  test(`captura ${route}`, async ({ page }, info) => {
    await page.goto(route);
    await settle(page);
    // fuerza los reveals de scroll para que la captura muestre la página completa
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `test-results/shots/${label}/${info.project.name}${route.replaceAll("/", "_") || "_home"}.png`,
      fullPage: true,
    });
  });
}
