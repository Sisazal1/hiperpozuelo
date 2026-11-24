# Hiper Pozuelo — deployment

- **Production URL:** https://hiper-pozuelo.vercel.app
- **Vercel project:** sisazal1s-projects/hiper-pozuelo (`prj_` created 2026-11-12)
- **Source:** this directory (Codex session "Establecer base técnica Hiper Pozuelo")
- **Framework:** Next.js 15.5.29 (App Router), React 19, Tailwind 4, pnpm 9
- **Build:** `pnpm install --frozen-lockfile` + `pnpm build` — passes locally and on Vercel
- **Ignored from upload:** `node_modules`, `.next`, `work/`, `outputs/`, `start3020.log`, `tsconfig.tsbuildinfo`, `.env*` (see `.vercelignore`)

## Verified in a real browser (production)

| Route | Result |
|---|---|
| `/` | 200, hero + nav + packs, 32 links |
| `/shop` | 200, catalogue browser, "48 resultados" |
| `/packs` and `/packs/kitchen/small` | 200, deep link preselects Cocina · Pequeño (7,95 €, 5 artículos) |
| `/category/kitchen` | 200, "Cocina y menaje", 2.438 chars, correct `<title>` |
| `/product/espatula-silicona` | 200, 0,99 € + recommendations |
| `/cart` `/checkout` `/favorites` `/account` `/build-pack` | 200, empty/guest states render |
| Cart flow | Add-to-cart → badge "1" → cart totals (0,99 €) via `hp-shared-cart` in localStorage |
| Mobile 390×844 (device emulation) | `scrollWidth == clientWidth == 390`, no overflowing elements |
| Console | no failed resources, no 4xx/5xx |

## Known notes
- Catalogue is provisional seed data (`src/data/seed/hiper-pozuelo-catalogo-estimado.json`, 48 products, 9 categories, 12 bundles). Do not show "demo" or "orientativo" labels in the UI; see AGENTS.md.
- Products without a photo use a clean category tile (no text). "IMAGEN PENDIENTE" is no longer allowed; see AGENTS.md.
- `/packs/[family]/[tier]` renders the packs experience client-side, so its `<title>` stays "Hiper Pozuelo".

## Pedidos, backoffice y TPV
Código en `src/lib/server` (Postgres con `pg`; en local PGlite en `.data/`). Sin `DATABASE_URL` en Vercel quedan
apagados y la web no los anuncia (`ordersEnabled`, fijado al compilar en `next.config.ts`): pago al recibir,
seguimiento, desistimiento online, backoffice, TPV, inventario y KPIs. El checkout online con Stripe sí funciona.

Para encenderlos en producción:
1. Crear un Postgres (Neon u otro) y poner `DATABASE_URL`. El esquema se crea solo.
2. Poner `BACKOFFICE_PASSWORD` y `BACKOFFICE_SECRET` (24 caracteres o más).
3. En el webhook de Stripe, añadir a `checkout.session.completed`: `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`,
   `charge.dispute.created`, `radar.early_fraud_warning.created`, `review.opened`.
4. Volver a desplegar y entrar en `/backoffice`.

Prueba completa en local con pagos de prueba: `node tests/e2e/orders.mjs` (servidor en :3100).

## Redeploy
```
cd "C:/Users/simon/Documents/Codex/2026-11-11/no"
npx vercel deploy --prod --yes
```
