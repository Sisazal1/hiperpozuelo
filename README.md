# Hiper Pozuelo

## Pagos (Stripe test)

Configura `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_SITE_URL` a partir de `.env.example`. Para recibir eventos localmente:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.
