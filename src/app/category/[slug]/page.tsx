import { notFound } from "next/navigation";
import { getAllCategories, getCategoryBySlug } from "@/lib/catalog/categories";
import { getProductsByCategory } from "@/lib/catalog/products";
import { CatalogBrowser } from "@/app/shop/catalog-browser";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <CatalogBrowser
      products={getProductsByCategory(category.id)}
      categoryId={category.id}
      title={category.name_es}
      intro={category.description_es}
    />
  );
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return {
    title: category ? category.name_es : "Categoría no encontrada",
    description: category?.description_es,
  };
}
export function generateStaticParams() {
  return getAllCategories().map((c) => ({ slug: c.slug ?? c.id }));
}
