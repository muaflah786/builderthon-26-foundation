import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { DEMO_PRODUCTS, DEMO_SITE } from "@/assistant-sites/malabar-spice/catalog";
import { ProductCard } from "@/app/demo/_components/product-card";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Fresh single-origin Kerala spices: pepper, cardamom, cinnamon, turmeric and blends.",
};

export default function DemoHome() {
  const bestSellers = DEMO_PRODUCTS.filter((p) =>
    ["black-pepper", "green-cardamom", "garam-masala"].includes(p.slug),
  );
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" data-assistant-context>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{DEMO_SITE.name}</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">{DEMO_SITE.tagline}</p>
        <p className="max-w-2xl">
          Free shipping across India on orders of ₹799 or more. Have a question? Ask Mira, our AI
          assistant — the chat button is at the bottom right. You can ask in English or Malayalam.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/demo/products" className={buttonClasses({ size: "lg" })}>
            Shop spices
          </Link>
          <Link
            href="/demo/shipping-returns"
            className={buttonClasses({ variant: "secondary", size: "lg" })}
          >
            Shipping & returns
          </Link>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Best-sellers</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {bestSellers.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
