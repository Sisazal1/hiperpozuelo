import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllCategories } from "@/lib/catalog/categories";
import { getAllProducts } from "@/lib/catalog/products";
import { packFamilies, packTiers } from "@/lib/catalog/bundles";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const url = (path: string) => `${siteConfig.url}${path}`;
  const staticPaths = ["", "/shop", "/packs", "/build-pack", "/faq", "/envios-y-devoluciones", "/contacto", "/aviso-legal", "/privacidad", "/cookies", "/condiciones"];

  return [
    ...staticPaths.map((path) => ({ url: url(path), lastModified: now, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...getAllCategories().map((c) => ({ url: url(`/category/${c.slug ?? c.id}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...packFamilies.flatMap((f) => packTiers.map((tier) => ({ url: url(`/packs/${f.id}/${tier}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 }))),
    ...getAllProducts().map((p) => ({ url: url(`/product/${p.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
