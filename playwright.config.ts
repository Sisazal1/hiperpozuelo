import { defineConfig, devices } from "@playwright/test";

// Auditoría contra el build de producción (no contra `next dev`): así las métricas de
// rendimiento, hidratación y consola son las que verá un cliente real.
const PORT = Number(process.env.AUDIT_PORT || 3100);
export const BASE_URL = process.env.AUDIT_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results/artifacts",
  fullyParallel: true,
  workers: Number(process.env.AUDIT_WORKERS || 2),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/report.json" }]],
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    trace: "retain-on-failure",
    locale: "es-ES",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
  webServer: process.env.AUDIT_URL
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
