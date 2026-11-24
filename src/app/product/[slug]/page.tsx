import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog/products";
import ProductExperience from "./ProductExperience";
import { reviewData } from "@/lib/server/reviews";

// Se genera al pedirla y se renueva al publicarse o retirarse una reseña.
export const revalidate = 600;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const reviews = await reviewData("product", product.id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_es,
    description: product.description_es,
    sku: product.id,
    ...(reviews.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count, bestRating: 5, worstRating: 1 } } : {}),
    offers: {
      "@type": "Offer",
      price: product.proposed_price_eur,
      priceCurrency: "EUR",
      availability: "https://schema.org/PreOrder",
    },
  };
  return (
    <div className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductExperience product={product} reviews={reviews} />
    </div>
  );
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProductBySlug(slug);
  return {
    title: p ? `${p.name_es} · ${p.subcategory}` : "Producto no encontrado",
    description: p?.description_es,
    openGraph: { title: p?.name_es, description: p?.description_es },
  };
}
export function generateStaticParams() {
  return [] as { slug: string }[];
}
