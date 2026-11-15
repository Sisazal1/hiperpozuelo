import Link from "next/link";
import { getAllCategories } from "@/lib/catalog/categories";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

/** Server-rendered heading + category chips (real links, so they work without JS and are crawlable). */
export function CatalogHeader({ title, intro, crumbs, activeCategory }: { title: string; intro: string; crumbs: Crumb[]; activeCategory?: string }) {
  return (
    <header className="page-head">
      <Breadcrumbs items={crumbs} />
      <h1>{title}</h1>
      <p className="lead">{intro}</p>
      <nav className="chip-row chip-row--flush" aria-label="Categorías">
        <Link className={`chip ${!activeCategory ? "is-active" : ""}`} href="/shop" aria-current={!activeCategory ? "page" : undefined}>Todo</Link>
        {getAllCategories().map((category) => (
          <Link key={category.id} className={`chip ${activeCategory === category.id ? "is-active" : ""}`} href={`/category/${category.id}`} aria-current={activeCategory === category.id ? "page" : undefined}>
            {category.name_es}
          </Link>
        ))}
      </nav>
    </header>
  );
}
