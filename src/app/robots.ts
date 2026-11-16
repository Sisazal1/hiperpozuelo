import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/checkout", "/account", "/favorites", "/styleguide", "/api/"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://hiper-pozuelo.vercel.app"}/sitemap.xml`,
  };
}
