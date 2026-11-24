import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/catalog/products";
import { getAllCategories } from "@/lib/catalog/categories";
import { getAllBundles } from "@/lib/catalog/bundles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hiper-pozuelo.vercel.app";
  const now = new Date();
  const pages = ["/", "/shop", "/packs", "/build-pack", "/reposicion", "/faq", "/contacto", "/envios-y-devoluciones", "/pago-seguro", "/privacidad", "/cookies", "/condiciones", "/aviso-legal"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, lastModified: now, priority: p === "/" ? 1 : 0.6 })),
    ...getAllBundles().map((b) => ({ url: `${base}/packs/${b.category_id}/${b.tier}`, lastModified: now, priority: 0.8 })),
    ...getAllCategories().map((c) => ({ url: `${base}/category/${c.slug ?? c.id}`, lastModified: now, priority: 0.7 })),
    ...getAllProducts().map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: now, priority: 0.6 })),
  ];
}
