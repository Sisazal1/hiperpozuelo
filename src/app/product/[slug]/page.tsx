import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog/products";
import ProductExperience from "./ProductExperience";
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_es,
    description: product.description_es,
    sku: product.id,
    offers: {
      "@type": "Offer",
      price: product.proposed_price_eur,
      priceCurrency: "EUR",
      availability: "https://schema.org/PreOrder",
    },
  };
  return (
    <main className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductExperience product={product} />
    </main>
  );
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProductBySlug(slug);
  return {
    title: p ? `${p.name_es} · Hiper Pozuelo` : "Producto no encontrado",
    description: p?.description_es,
    openGraph: { title: p?.name_es, description: p?.description_es },
  };
}
