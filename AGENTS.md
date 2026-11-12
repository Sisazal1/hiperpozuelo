# AGENTS.md — Hiper Pozuelo (tienda demo)

Contexto para agentes de código (OpenCode, Codex, Claude Code). Léelo antes de tocar nada.

## Qué es esto

Tienda online de demostración para **Hiper Pozuelo S.L.** (bazar de barrio en C/ Sevilla 5,
Pozuelo de Alarcón, Madrid). Es un escaparate funcional: catálogo estimado, packs, cesta y
checkout **sin pasarela de pago real**. Nunca inventes precios, stock ni datos del cliente:
todo lo no confirmado va marcado como «pendiente de validación comercial» en la UI.

## Stack

- Next.js 15 (App Router, `src/app`) + React 19 + TypeScript + Tailwind 4 (`@tailwindcss/postcss`).
- Sin backend ni base de datos: el catálogo es un JSON semilla y el estado vive en `localStorage`.
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
- No añadas imágenes inventadas: los huecos llevan placeholder «IMAGEN PENDIENTE» a propósito.
- Los textos legales llevan `[Pendiente de confirmación comercial]` hasta que el cliente confirme.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm dev            # localhost:3000
pnpm build          # debe pasar antes de cualquier entrega
pnpm lint
pnpm validate:catalog   # valida el JSON semilla
```

## Entrega y despliegue

- Repo: https://github.com/Sisazal1/hiperpozuelo (rama `main`).
- Producción: https://hiper-pozuelo.vercel.app (proyecto Vercel `sisazal1s-projects/hiper-pozuelo`,
  CLI ya autenticado: `npx vercel deploy --prod --yes`).
- Commit convencional (`feat:`, `fix:`, `chore:`) y `pnpm build` verde antes de empujar.
