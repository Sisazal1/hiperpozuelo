# AGENTS.md — Hiper Pozuelo (tienda en preapertura)

Contexto para agentes de código (OpenCode, Codex, Claude Code). Léelo antes de tocar nada.

## Qué es esto

Tienda online de **Hiper Pozuelo S.L.** (bazar de barrio en C/ Sevilla 5, Pozuelo de Alarcón,
Madrid) en **preapertura**, con pago de Stripe en modo test. El objetivo es una experiencia
premium y lista para lanzar, no un escaparate de demostración. Hay rutas de servidor
(`/api/checkout`, webhook de Stripe). No hay base de datos propia: el pedido vive en Stripe y en
su metadata, salvo que el usuario apruebe otra cosa.

## Reglas de contenido y confianza (prevalecen sobre cualquier brief antiguo)

- Nunca inventes precios, stock, descuentos, reseñas, datos de empresa ni fotos de producto.
- Los datos desconocidos van como `null` en `src/config/site.ts` y la UI los oculta.
  PROHIBIDO mostrar «IMAGEN PENDIENTE», «[Pendiente de confirmación comercial]», «demo» u
  «orientativo» en la interfaz. Lo que falte lo lista `pnpm check:launch`.
- Productos sin foto: tile de categoría limpio, sin texto. Las imágenes generadas con IA solo
  se usan como ambiente (hero, banners, estados vacíos), registradas en
  `src/data/image-manifest.json` con `kind: "ambient"`. Nunca como foto de un producto concreto.
- Las páginas legales llevan texto real conforme a la ley española con los datos de `site.ts`,
  sin etiquetas de pendiente.

## Cómo trabajar

- Antes de cualquier tarea de UI, lee `DESIGN_BRIEF.md` y las skills `impeccable`,
  `design-taste-frontend` y `emil-design-eng` de `.agents/skills`, y cita al final qué reglas
  aplicaste.
- Las instrucciones del prompt del usuario prevalecen sobre cualquier brief antiguo de `docs/`.
  Los archivos de `docs/archivo/` son históricos: no apliques sus «No tocar».
- Cada tarea termina con `pnpm build` verde y capturas reales (1440 y 390 px).
- Si no cabe todo en la sesión, termina el paso en curso, haz commit y di qué falta.

## Stack

- Next.js 15 (App Router, `src/app`) + React 19 + TypeScript + Tailwind 4 (`@tailwindcss/postcss`).
- El catálogo es un JSON semilla, la cesta y los favoritos viven en `localStorage` y el pago pasa por Stripe (`stripe` en `package.json`).
- Gestor de paquetes: **pnpm** (`pnpm-lock.yaml`). No generes `package-lock.json`.

## Estructura

```
src/app/                 rutas: /, /shop, /packs, /packs/[family]/[tier], /category/[slug],
                         /product/[slug], /cart, /checkout, /build-pack, /account/*, /favorites,
                         /faq, /aviso-legal, /envios-y-devoluciones
src/components/          GlobalNavbar, PacksExperience, CartDrawer, SiteFooter
src/lib/catalog/         acceso al catálogo (index, products, bundles, categories, pricing, recommendations)
src/lib/checkout/config.ts, src/config/commerce.ts   envío, umbrales, textos de comercio
src/state/store.tsx      cesta y favoritos (claves localStorage: hp-shared-cart, hp-favorites)
src/data/seed/hiper-pozuelo-catalogo-estimado.json   48 productos, 9 categorías, 12 bundles
src/types/catalog.ts     tipos del dominio
```

## Convenciones

- Español de España en toda la UI; importes con coma decimal y `€` (`0,99 €`).
- Marcas del catálogo: los slugs de categorías son los `id` del JSON (`kitchen`, `bath`…), no
  traducciones. Los deep links de pack son `/packs/<familia>/<tier>` con tier `small|medium|large`.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm dev            # localhost:3000 — escribe en .next-dev
pnpm build          # escribe en .next; seguro con `pnpm dev` corriendo
pnpm lint
pnpm validate:catalog
```

Dev y build usan carpetas distintas (`.next-dev` vs `.next`, ver `next.config.ts`). Antes se
pisaban y el servidor de desarrollo devolvía 500 en todas las rutas tras cada build; ya no.

## Entrega y despliegue

- Repo: https://github.com/Sisazal1/hiperpozuelo (rama `main`).
- Producción: https://hiper-pozuelo.vercel.app (proyecto Vercel `sisazal1s-projects/hiper-pozuelo`,
  CLI ya autenticado: `npx vercel deploy --prod --yes`).
- Commit convencional (`feat:`, `fix:`, `chore:`) y `pnpm build` verde antes de empujar.
