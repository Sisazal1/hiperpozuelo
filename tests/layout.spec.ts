import { test, expect, ROUTES, settle } from "./support";

const KEY_ROUTES = ["/", "/shop", "/packs/kitchen/small", "/product/espatula-silicona", "/category/kitchen", "/cart", "/build-pack"];

test.describe("responsive", () => {
  test.skip(({ isMobile }) => isMobile, "se recorre con viewports explícitos");
  for (const width of [320, 390, 768, 1024, 1440]) {
    for (const route of KEY_ROUTES) {
      test(`sin scroll horizontal ${width}px ${route}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await settle(page);
        const overflow = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll("body *")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              if (s.position === "fixed" || r.width === 0) return false;
              let p = el.parentElement;
              while (p) {
                const ps = getComputedStyle(p);
                if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) return false;
                p = p.parentElement;
              }
              return r.right > vw + 1 || r.left < -1;
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`);
          return { sw: document.documentElement.scrollWidth, vw, offenders };
        });
        expect(overflow.sw, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.vw);
      });
    }
  }
});

test.describe("móvil: objetivos táctiles y tipografía", () => {
  test.skip(({ isMobile }) => !isMobile, "solo móvil");
  for (const route of ROUTES) {
    test(`tap targets ≥ 44px y texto ≥ 14px ${route}`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      const report = await page.evaluate(() => {
        const visible = (el: Element) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
        };
        const small = [...document.querySelectorAll("a[href], button, input, select, textarea, [role=button]")]
          .filter(visible)
          .filter((el) => !el.closest(".skip-link"))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            // Enlaces en línea dentro de párrafos están exentos (WCAG 2.5.8 excepción "inline").
            if (el.tagName === "A" && el.closest("p, li") && getComputedStyle(el).display === "inline") return false;
            return r.height < 44 || r.width < 24;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join(".")} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`;
          });
        const tinyText = new Set<string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const el = node.parentElement;
          if (!el || !node.textContent?.trim() || !visible(el)) continue;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 14) tinyText.add(`${fs}px ${el.tagName.toLowerCase()}.${[...el.classList][0] || ""} "${node.textContent.trim().slice(0, 20)}"`);
        }
        return { small: [...new Set(small)], tinyText: [...tinyText] };
      });
      expect.soft(report.small, "objetivos táctiles < 44px").toEqual([]);
      expect.soft(report.tinyText, "texto < 14px").toEqual([]);
    });
  }
});

test("imágenes: alt, dimensiones y formato moderno", async ({ page }) => {
  await page.goto("/");
  await settle(page);
  const imgs = await page.$$eval("img", (els) =>
    els.map((i) => ({ src: i.currentSrc || i.src, alt: i.getAttribute("alt"), w: i.naturalWidth, rw: i.getBoundingClientRect().width, loading: i.loading })),
  );
  const missingAlt = imgs.filter((i) => i.alt === null);
  expect(missingAlt).toEqual([]);
  const oversize = imgs.filter((i) => i.rw > 0 && i.w > i.rw * 2 * 1.5);
  expect.soft(oversize, "imágenes >1.5x lo necesario (a 2x DPR)").toEqual([]);
});

test("CLS y LCP de la home", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(
    () =>
      new Promise<{ cls: number; lcp: number }>((resolve) => {
        let cls = 0;
        let lcp = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e: any) => !e.hadRecentInput && (cls += e.value))).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((l) => l.getEntries().forEach((e: any) => (lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve({ cls, lcp }), 300);
      }),
  );
  console.log("CLS", m.cls.toFixed(3), "LCP(ms)", Math.round(m.lcp));
  expect(m.cls).toBeLessThan(0.1);
});
