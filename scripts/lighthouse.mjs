// Lighthouse (móvil, throttling simulado por defecto) contra el build de producción.
// Uso: node scripts/lighthouse.mjs [baseUrl] [etiqueta]
import fs from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const base = process.argv[2] || "http://localhost:3100";
const label = process.argv[3] || "now";
const routes = ["/", "/shop", "/packs/kitchen/small", "/product/espatula-silicona", "/category/kitchen"];
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const rows = [];
try {
  for (const route of routes) {
    const { lhr } = await lighthouse(`${base}${route}`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const a = lhr.audits;
    rows.push({
      route,
      perf: Math.round(lhr.categories.performance.score * 100),
      a11y: Math.round(lhr.categories.accessibility.score * 100),
      bp: Math.round(lhr.categories["best-practices"].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      FCP: a["first-contentful-paint"].displayValue,
      LCP: a["largest-contentful-paint"].displayValue,
      TBT: a["total-blocking-time"].displayValue,
      CLS: a["cumulative-layout-shift"].displayValue,
      SI: a["speed-index"].displayValue,
      bytes: Math.round(a["total-byte-weight"].numericValue / 1024) + " KiB",
      failed: Object.values(a)
        .filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== "informative" && x.scoreDisplayMode !== "notApplicable")
        .map((x) => x.id),
    });
  }
} finally {
  await chrome.kill();
}
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(`test-results/lighthouse-${label}.json`, JSON.stringify(rows, null, 2));
console.table(rows.map(({ failed, ...r }) => r));
for (const r of rows) console.log(r.route, "→", r.failed.join(", "));
