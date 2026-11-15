/**
 * Single source of truth for business information.
 *
 * Anything left as `null` is NOT invented: the UI either hides it or shows a
 * single, neutral "pendiente" line in the place where the customer needs it
 * (legal notice, contact page, pickup details). Fill these in before launch.
 */
export const siteConfig = {
  name: "Hiper Pozuelo",
  url: "https://hiper-pozuelo.vercel.app",
  tagline: "Todo para tu hogar",
  description:
    "Packs y productos para equipar tu hogar: cocina, baño, limpieza, orden y más. Compra online con envío a domicilio o recogida en tienda.",

  /** While true, a single slim notice explains that no payment or shipment is real. */
  prelaunch: true,

  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
    hours: null as string | null,
  },

  legal: {
    company: null as string | null,
    taxId: null as string | null,
    registeredAddress: null as string | null,
  },

  pickup: {
    address: null as string | null,
    hours: null as string | null,
  },

  delivery: {
    /** e.g. "24–48 h laborables". Left null until it is commercially confirmed. */
    estimate: null as string | null,
  },

  lastLegalUpdate: "13 de noviembre de 2026",
};
