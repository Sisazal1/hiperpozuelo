import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw, Store, Truck } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { getBundleById, getBundleTitle } from "@/lib/catalog/bundles";
import { getCategoryById } from "@/lib/catalog/categories";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { getAllProducts, getProductBySlug, getProductsByCategory } from "@/lib/catalog/products";
import { getComplementaryProducts } from "@/lib/catalog/recommendations";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { ProductBuyBox } from "./ProductBuyBox";

export const dynamicParams = false;
export const generateStaticParams = () => getAllProducts().map((product) => ({ slug: product.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const description = `${product.description_es} ${formatEuroPrice(product.proposed_price_eur)}. Envío a domicilio o recogida en tienda.`;
  return {
    title: product.name_es,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name_es, description, url: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const category = getCategoryById(product.category_id);
  const packs = product.pack_ids.map(getBundleById).filter((bundle): bundle is NonNullable<typeof bundle> => Boolean(bundle));
  const complementary = getComplementaryProducts(product.id).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const fill = getProductsByCategory(product.category_id).filter((p) => p.id !== product.id && !complementary.some((c) => c.id === p.id));
  const related = [...complementary, ...fill].slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_es,
    description: product.description_es,
    category: category?.name_es,
    sku: product.id,
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/product/${product.slug}`,
      priceCurrency: commerceConfig.currency,
      price: product.proposed_price_eur.toFixed(2),
    },
  };

  return (
    <div className="container section section--top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Tienda", href: "/shop" },
          ...(category ? [{ label: category.name_es, href: `/category/${category.id}` }] : []),
          { label: product.name_es },
        ]}
      />

      <div className="pdp">
        <div className="pdp__gallery">
          <div className="pdp__main"><ProductVisual product={product} sizes="(max-width: 900px) 100vw, 50vw" priority /></div>
        </div>

        <div className="pdp__info">
          <span className="eyebrow">{category?.name_es} · {product.subcategory}</span>
          <h1>{product.name_es}</h1>
          <p className="pdp__desc">{product.description_es}</p>
          <p className="pdp__price"><span className="price price--xl">{formatEuroPrice(product.proposed_price_eur)}</span></p>

          <ProductBuyBox productId={product.id} productName={product.name_es} price={product.proposed_price_eur} />

          <ul className="pdp__perks">
            <li>
              <Truck size={20} aria-hidden="true" />
              <span><strong>Envío a domicilio {formatEuroPrice(commerceConfig.standardShippingFee)}</strong><small>Gratis en pedidos desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}{siteConfig.delivery.estimate ? ` · ${siteConfig.delivery.estimate}` : ""}</small></span>
            </li>
            <li>
              <Store size={20} aria-hidden="true" />
              <span><strong>Recogida en tienda gratis</strong><small>{siteConfig.pickup.address ?? "Te confirmamos la dirección y el horario al hacer el pedido"}</small></span>
            </li>
            <li>
              <RotateCcw size={20} aria-hidden="true" />
              <span><strong>Devoluciones</strong><small><Link href="/envios-y-devoluciones#devoluciones">Consulta las condiciones</Link></small></span>
            </li>
          </ul>

          {packs.length > 0 && (
            <div className="pdp__packs">
              <h2>Incluido en estos packs</h2>
              <ul>
                {packs.map((bundle) => (
                  <li key={bundle.id}><Link href={`/packs/${bundle.category_id}/${bundle.tier}`}>{getBundleTitle(bundle)}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="pdp__related" aria-labelledby="related-title">
          <div className="section-head"><div><h2 id="related-title">Combina bien con</h2></div></div>
          <div className="grid-products">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
