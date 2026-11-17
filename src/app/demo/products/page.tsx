import type { Metadata } from "next";
import { DEMO_PRODUCTS } from "@/assistant-sites/malabar-spice/catalog";
import { ProductCard } from "@/app/demo/_components/product-card";

export const metadata: Metadata = {
  title: "Shop",
  description: "All Malabar Spice Market products with prices, pack sizes and availability.",
};

export default function ProductsPage() {
  const categories = [...new Set(DEMO_PRODUCTS.map((p) => p.category))];
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      {categories.map((category) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_PRODUCTS.filter((p) => p.category === category).map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
