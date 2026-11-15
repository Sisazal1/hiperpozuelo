import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllProducts } from "@/lib/catalog/products";
import { CatalogHeader } from "@/components/shop/CatalogHeader";
import { CatalogResults, CatalogSkeleton } from "@/components/shop/CatalogResults";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Todos los productos de Hiper Pozuelo: cocina, baño, limpieza, orden, papelería, textil y más.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <div className="container section section--top">
      <CatalogHeader title="Tienda" intro="Todo lo que necesitas para tu hogar y tu día a día." crumbs={[{ label: "Inicio", href: "/" }, { label: "Tienda" }]} />
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults products={getAllProducts()} />
      </Suspense>
    </div>
  );
}
