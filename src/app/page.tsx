import Link from "next/link";
import { ArrowRight, PackageCheck, ShoppingBag, Store, Truck } from "lucide-react";
import { commerceConfig } from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { packFamilies } from "@/lib/catalog/bundles";
import { getAllCategories } from "@/lib/catalog/categories";
import { getAllProducts } from "@/lib/catalog/products";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { CategoryVisual } from "@/components/ui/ProductVisual";
import { PackFamilyCard } from "@/components/ui/PackFamilyCard";
import { ProductCard } from "@/components/ui/ProductCard";

export default function HomePage() {
  const products = getAllProducts();
  const categories = getAllCategories();
  // One representative product per category keeps the home varied instead of showing only kitchen items.
  const picks = categories.flatMap((category) => products.filter((p) => p.category_id === category.id).slice(0, 1)).slice(0, 8);
  const heroProducts = [products[0], products[1], products[2], products[3]].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: siteConfig.name, url: siteConfig.url, logo: `${siteConfig.url}/brand/hiper-pozuelo-logo.png` },
      {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        potentialAction: { "@type": "SearchAction", target: `${siteConfig.url}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">{siteConfig.tagline}</span>
            <h1>Tu casa, lista para empezar.</h1>
            <p className="lead">
              Packs pensados por estancia y {products.length} productos para el día a día. Recíbelo en casa o recógelo en tienda.
            </p>
            <div className="hero__actions">
              <Link className="btn btn-primary btn-lg" href="/packs">Ver packs <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className="btn btn-secondary btn-lg" href="/shop">Explorar tienda</Link>
            </div>
            <ul className="trust-row">
              <li><Truck size={18} aria-hidden="true" /> Envío gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}</li>
              <li><Store size={18} aria-hidden="true" /> Recogida gratis</li>
              <li><ShoppingBag size={18} aria-hidden="true" /> Sin crear cuenta</li>
            </ul>
          </div>

          <aside className="hero__panel" aria-labelledby="hero-panel-title">
            <div className="hero__panel-head">
              <h2 id="hero-panel-title">Para empezar hoy</h2>
              <Link className="link-arrow" href="/shop">Ver todo <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="hero__panel-grid">
              {heroProducts.map((product, index) => <ProductCard key={product.id} product={product} compact priority={index < 2} />)}
            </div>
          </aside>
        </div>

        <div className="container">
          <nav className="chip-row" aria-label="Categorías">
            {categories.map((category) => (
              <Link key={category.id} className="chip" href={`/category/${category.id}`}>{category.name_es}</Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="section" aria-labelledby="packs-title">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Packs por estancia</span>
              <h2 id="packs-title">Elige tu pack y listo</h2>
              <p>Cada familia tiene tres tamaños. Compara el contenido y el precio antes de entrar.</p>
            </div>
            <Link className="link-arrow" href="/packs">Todos los packs <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid-packs">
            {packFamilies.map((family) => <PackFamilyCard key={family.id} family={family} />)}
          </div>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="cats-title">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Categorías</span>
              <h2 id="cats-title">Compra por categoría</h2>
            </div>
            <Link className="link-arrow" href="/shop">Toda la tienda <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid-categories">
            {categories.map((category) => (
              <Link key={category.id} className="cat-tile" href={`/category/${category.id}`}>
                <CategoryVisual id={category.id} size={28} />
                <span className="cat-tile__text">
                  <strong>{category.name_es}</strong>
                  <small>{category.description_es}</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" className="cat-tile__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="products-title">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Selección</span>
              <h2 id="products-title">Productos para tu día a día</h2>
            </div>
            <Link className="link-arrow" href="/shop">Ver los {products.length} productos <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid-products">
            {picks.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Cómo funciona</span><h2 id="how-title">Comprar es así de simple</h2></div></div>
          <ol className="steps">
            <li><span className="steps__n">1</span><h3>Elige un pack o productos sueltos</h3><p>Compara tamaños y revisa qué incluye cada pack antes de añadirlo.</p></li>
            <li><span className="steps__n">2</span><h3>Decide cómo recibirlo</h3><p>Envío a domicilio ({formatEuroPrice(commerceConfig.standardShippingFee)}, gratis desde {formatEuroPrice(commerceConfig.freeShippingThreshold)}) o recogida gratis en tienda.</p></li>
            <li><span className="steps__n">3</span><h3>Confirma como invitado</h3><p>Sin crear cuenta. Ves el total completo antes de confirmar.</p></li>
          </ol>
        </div>
      </section>

      <section className="section" aria-label="Crea tu pack">
        <div className="container">
          <div className="banner">
            <div>
              <span className="eyebrow">¿Prefieres elegir tú?</span>
              <h2>Crea tu propio pack</h2>
              <p>Selecciona producto a producto y ajusta las cantidades a lo que necesitas.</p>
            </div>
            <Link className="btn btn-light btn-lg" href="/build-pack"><PackageCheck size={18} aria-hidden="true" /> Crear mi pack</Link>
          </div>
        </div>
      </section>
    </>
  );
}
