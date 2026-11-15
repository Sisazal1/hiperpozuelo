import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://hiper-pozuelo.vercel.app";
  return ["/", "/shop", "/packs", "/faq", "/contacto", "/privacidad", "/cookies", "/condiciones", "/envios-y-devoluciones", "/aviso-legal"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
