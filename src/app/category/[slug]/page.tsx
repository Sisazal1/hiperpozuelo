import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllCategories, getCategoryBySlug } from "@/lib/catalog/categories";
import { getProductsByCategory } from "@/lib/catalog/products";
import { CatalogHeader } from "@/components/shop/CatalogHeader";
import { CatalogResults, CatalogSkeleton } from "@/components/shop/CatalogResults";

export const dynamicParams = false;
export const generateStaticParams = () => getAllCategories().map((category) => ({ slug: category.slug ?? category.id }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Categoría no encontrada" };
  return { title: category.name_es, description: category.description_es, alternates: { canonical: `/category/${slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <div className="container section section--top">
      <CatalogHeader
        title={category.name_es}
        intro={category.description_es}
        activeCategory={category.id}
        crumbs={[{ label: "Inicio", href: "/" }, { label: "Tienda", href: "/shop" }, { label: category.name_es }]}
      />
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults products={getProductsByCategory(category.id)} scoped />
      </Suspense>
    </div>
  );
}
