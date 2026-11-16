import AxeBuilder from "@axe-core/playwright";
import { test, expect, ROUTES, settle } from "./support";
import fs from "node:fs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const route of ROUTES) {
  test(`axe ${route}`, async ({ page }, info) => {
    await page.goto(route);
    await settle(page);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
    }));
    fs.mkdirSync("test-results/axe", { recursive: true });
    fs.writeFileSync(
      `test-results/axe/${info.project.name}${route.replaceAll("/", "_") || "_home"}.json`,
      JSON.stringify(summary, null, 2),
    );
    expect(summary).toEqual([]);
  });
}

test("drawer de cesta abierto pasa axe", async ({ page }) => {
  await page.goto("/product/espatula-silicona");
  await page.locator(".add-main").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(TAGS).analyze();
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
});
