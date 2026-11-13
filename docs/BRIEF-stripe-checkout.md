# Brief — Stripe Checkout real (modo test) en Hiper Pozuelo

> Repo: `C:\Users\simon\Documents\Codex\2026-11-11\no` (rama `main`, HEAD limpio antes de empezar).
> Fase: **solo integración de pago en modo test**. No hay base de datos, no hay logística real, no
> hay emails. Esta fase termina cuando un pago de prueba con `4242 4242 4242 4242` completa la
> compra y la web lo confirma leyendo la sesión de Stripe. No empieces otras fases.

## Cambio

Convertir el checkout demo en un **pago real con Stripe Checkout (hosted)**:

1. `POST /api/checkout` — recibe `{ lines, delivery, customer, address }`, **recalcula los importes en
   el servidor** desde `src/lib/catalog` (ignora cualquier precio que venga del cliente), crea una
   `stripe.checkout.sessions` `mode: "payment"` y devuelve `{ url }`. Usa `price_data` por línea con
   `currency: "eur"`, nombre del producto/pack, y `shipping_options` para entrega a domicilio o
   recogida según `delivery`. `success_url = <origin>/checkout?session_id={CHECKOUT_SESSION_ID}`,
   `cancel_url = <origin>/checkout?canceled=1`. Metadata de la sesión: `customer_email`,
   `delivery`, `order_items` (JSON compacto con ids y cantidades).
2. `GET /api/checkout?session_id=...` — recupera la sesión y devuelve `{ status, payment_status,
   amount_total, customer_email, line_items }` **únicamente** si la sesión existe y su
   `payment_status === "paid"`; nunca devuelvas objetos de Stripe completos.
3. `POST /api/stripe/webhook` — verifica la firma con `stripe.webhooks.constructEvent` contra
   `STRIPE_WEBHOOK_SECRET`; en `checkout.session.completed` registra en el log del servidor el id de
   sesión y el email; responde 200. Cuerpo crudo vía `await req.text()`, `runtime = "nodejs"`.
4. `src/app/checkout/page.tsx` — el paso 4 deja de listar métodos demo: un solo botón «Pagar con
   tarjeta, Bizum o Apple Pay» hace `POST /api/checkout` y redirige a `session.url`. Al volver con
   `session_id`, el paso 5 se renderiza **desde** `GET /api/checkout`, vacía la cesta y muestra
   importe pagado y email. Con `canceled=1`, vuelve al paso 4 con el aviso «Pago cancelado» y la
   cesta intacta. Elimina `hp-demo-orders` de este flujo.
5. `.env.example` con `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`,
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. `README.md`: sección «Pagos (Stripe test)» con
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` y la tarjeta de prueba.

Dependencias permitidas: solo `stripe` (`pnpm add stripe`). Nada de SDKs de UI en el cliente.

## No tocar

- `src/data/seed/hiper-pozuelo-catalogo-estimado.json`, `src/lib/catalog/*`, `src/config/commerce.ts`
  y ningún precio del catálogo.
- `/faq`, `/aviso-legal`, `/envios-y-devoluciones` y cualquier texto legal: siguen con
  `[Pendiente de confirmación comercial]`.
- `AGENTS.md`, `opencode.json`, `ai.cmd`, `abrir-opencode.cmd`, `.vercelignore`, `pnpm-lock.yaml`
  (salvo lo que añada `pnpm add stripe`), y la sección de despliegue del README.
- No crees base de datos, ni KV, ni tabla de pedidos: el pedido vive en Stripe y en su metadata.
- No pongas ninguna clave en el repo ni en el cliente; nada de `sk_...` fuera de `process.env`.

## Estados de error que la UI debe mostrar

- Sin `STRIPE_SECRET_KEY` o con Stripe caído: `/api/checkout` responde **503** con
  `{ error: "payment_unavailable" }` y el paso 4 muestra «El pago no está disponible ahora mismo.
  Tu cesta se ha conservado.» sin borrar nada.
- Sesión no pagada o `session_id` inventado: el paso 5 muestra «No hemos podido confirmar el pago»
  con enlace al carrito. Nunca un estado de éxito optimista.

## Verificación (pega la salida real de cada comando)

1. `pnpm build` → termina con `✓ Compiled successfully` y lista `/api/checkout` y
   `/api/stripe/webhook` como rutas `ƒ`.
2. `grep -rn "hp-demo-orders\|demoPaymentMethods\|no procesa cobros reales" src` → **0 líneas**.
3. `pnpm start` en background + `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/checkout -H "content-type: application/json" -d '{"lines":[],"delivery":"delivery"}'`
   → `503` (sin claves configuradas), y el JSON de respuesta es `{"error":"payment_unavailable"}`.
4. `curl -s "localhost:3000/api/checkout?session_id=cs_test_falso"` → `404` y `{"error":"not_found"}`.
5. `pnpm lint` → sin errores nuevos.

## Commit

Uno solo: `feat(checkout): Stripe Checkout real en modo test con confirmación server-side`.
No hagas `git push`.
