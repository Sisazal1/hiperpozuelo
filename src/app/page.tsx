import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, Lock, RotateCcw, Store, Truck } from "lucide-react";
import { getAllCategories } from "@/lib/catalog/categories";
import { getAllProducts } from "@/lib/catalog/products";
import { getAllBundles, calculateBundleTotal } from "@/lib/catalog/bundles";
import { families } from "@/lib/catalog/families";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { commerceConfig } from "@/config/commerce";
import { FAQ } from "@/lib/faq";
import { categoryIcon } from "@/components/catalog/ProductVisual";
import PackConfigurator from "@/components/home/PackConfigurator";
import ProductRail from "@/components/home/ProductRail";
import HeroParallax from "@/components/home/HeroParallax";

const categories = getAllCategories();
const products = getAllProducts();
const bundles = getAllBundles();
const free = formatEuroPrice(commerceConfig.freeShippingThreshold);


export default function Home() {
  const headline = ["Casa", "lista.", "Sin", "dar", "mil", "vueltas."];
  const rail = categories
    .flatMap((c) => products.filter((p) => p.category_id === c.id).slice(0, 2))
    .slice(0, 12);
  return (
    <>
      <section className="hp-hero" aria-labelledby="hero-title">
        <HeroParallax>
          <Image src="/ai/hero-home.webp" alt="" fill sizes="100vw" priority className="hp-hero-img" />
        </HeroParallax>
        <div className="hp-hero-scrim" aria-hidden="true" />
        <div className="hp-hero-inner">
          <span className="eyebrow hp-hero-eyebrow">Tu casa lista en un pack</span>
          <h1 id="hero-title" className="hp-hero-title">
            {headline.map((w, i) => (
              <span className="hp-hero-word" key={i} style={{ ["--i" as string]: i }}>
                <span>{w}</span>{" "}
              </span>
            ))}
          </h1>
          <p className="hp-hero-lede">
            Packs para cocina, baño, limpieza y estudio. Eliges estancia y tamaño, ves lo que lleva y listo.
          </p>
          <div className="hp-hero-actions">
            <Link className="btn btn-primary btn-lg" href="/packs">
              Elige tu pack <ArrowRight size={18} />
            </Link>
            <Link className="btn btn-ghost-light btn-lg" href="/shop">
              Ver toda la tienda
            </Link>
          </div>
          <ul className="hp-hero-trust">
            <li>
              <Truck size={16} /> Envío gratis desde {free}
            </li>
            <li>
              <Store size={16} /> Recogida gratis en tienda
            </li>
            <li>
              <Lock size={16} /> Compra sin cuenta
            </li>
          </ul>
        </div>
        <a className="hp-hero-scroll" href="#estancias" aria-label="Bajar a elegir estancia">
          <ChevronDown size={20} />
        </a>
      </section>

      <section className="hp-home-section" id="estancias" aria-labelledby="rooms-title">
        <div className="hp-home-section-heading" data-reveal>
          <div>
            <span className="eyebrow">Empieza por una estancia</span>
            <h2 id="rooms-title">¿Qué toca equipar?</h2>
          </div>
          <p>Cada pack viene en tres tamaños. El precio es la suma de lo que lleva.</p>
        </div>
        <ul className="hp-room-grid" data-reveal-stagger>
          {families.map((family, i) => {
            const fb = bundles.filter((b) => b.category_id === family.id);
            const from = Math.min(...fb.map(calculateBundleTotal));
            return (
              <li key={family.id} data-reveal>
                <Link className="hp-room-card" href={`/packs/${family.id}/medium`}>
                  <span className="hp-room-media">
                    <Image src={family.image} alt="" fill sizes="(max-width: 700px) 50vw, 25vw" priority={i < 2} />
                  </span>
                  <span className="hp-room-copy">
                    <span className="hp-room-name">{family.label}</span>
                    <span className="hp-room-from">
                      Desde <strong>{formatEuroPrice(from)}</strong>
                    </span>
                  </span>
                  <span className="hp-room-arrow" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="hp-value-marquee" aria-hidden="true">
        <div className="hp-value-marquee-track">
          {[0, 1].map((k) => (
            <span key={k}>
              Precio claro <i>✶</i> Cero sorpresas <i>✶</i> Envío gratis desde {free} <i>✶</i> Recogida gratis <i>✶</i> 14 días para desistir <i>✶</i>{" "}
            </span>
          ))}
        </div>
      </div>

      <section className="hp-home-section hp-configurator-section" aria-labelledby="config-title">
        <div className="hp-home-section-heading" data-reveal>
          <div>
            <span className="eyebrow">Compara sin sorpresas</span>
            <h2 id="config-title">Elige el tamaño que te encaja.</h2>
          </div>
          <p>Cambia de estancia y tamaño: ves al momento qué entra y cuánto cuesta.</p>
        </div>
        <PackConfigurator />
      </section>

      <section className="hp-home-section" aria-labelledby="cats-title">
        <div className="hp-home-section-heading" data-reveal>
          <div>
            <span className="eyebrow">Ordena tu compra</span>
            <h2 id="cats-title">O ve directo a lo que buscas.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Ver todo el catálogo <ArrowRight size={16} />
          </Link>
        </div>
        <ul className="hp-category-grid" data-reveal-stagger>
          {categories.map((category) => {
            const Icon = categoryIcon(category.id);
            const count = products.filter((p) => p.category_id === category.id).length;
            return (
              <li key={category.id} data-reveal>
                <Link href={`/category/${category.id}`} className={`hp-category-card pv-cat-${category.id}`}>
                  <span className="hp-category-icon" aria-hidden="true">
                    <Icon strokeWidth={1.4} />
                  </span>
                  <span className="hp-category-copy">
                    <strong>{category.name_es}</strong>
                    <small>
                      {count} {count === 1 ? "producto" : "productos"}
                    </small>
                  </span>
                  <ArrowRight size={18} className="hp-category-arrow" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="hp-home-section hp-rail-section" aria-labelledby="rail-title">
        <div className="hp-home-section-heading" data-reveal>
          <div>
            <span className="eyebrow">Básicos de cada estancia</span>
            <h2 id="rail-title">Lo que necesitas, sin lo que no.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Explorar todo <ArrowRight size={16} />
          </Link>
        </div>
        <ProductRail products={rail} />
      </section>

      <section className="hp-home-section how-section" aria-labelledby="how-title">
        <div className="hp-home-section-heading" data-reveal>
          <div>
            <span className="eyebrow">Fácil desde el primer clic</span>
            <h2 id="how-title">Tres pasos y a casa.</h2>
          </div>
        </div>
        <ol className="hp-how-steps" data-reveal-stagger>
          {[
            ["Elige una estancia", "Cocina, baño, limpieza o estudio. Empieza por lo que más te urge."],
            ["Escoge el tamaño", "Pequeño, mediano o grande. Ves cada producto y el precio total."],
            ["Recíbelo o recógelo", `Envío gratis desde ${free} o recogida gratis en tienda.`],
          ].map(([title, text], i) => (
            <li key={title} data-reveal>
              <span className="hp-how-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className="hp-home-faq" data-reveal>
          <h3>Dudas rápidas</h3>
          {FAQ.filter((f) => f.home).map(({ q, a }) => (
            <details key={q} className="faq-item">
              <summary>
                {q}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="hp-create-pack" data-reveal="scale" aria-labelledby="create-title">
        <div>
          <span className="eyebrow">Tu combinación, tus reglas</span>
          <h2 id="create-title">Monta tu propio pack.</h2>
          <p>Si ya sabes lo que necesitas, elige productos y cantidades a tu manera.</p>
          <ul className="hp-create-pack-points">
            <li>
              <Check size={16} /> Precio al momento
            </li>
            <li>
              <RotateCcw size={16} /> Lo editas cuando quieras desde la cesta
            </li>
          </ul>
        </div>
        <Link className="btn btn-primary btn-lg" href="/build-pack">
          Crear mi pack <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
