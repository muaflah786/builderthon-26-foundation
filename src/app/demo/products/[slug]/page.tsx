import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_PRODUCTS, findProduct } from "@/assistant-sites/malabar-spice/catalog";

export function generateStaticParams() {
  return DEMO_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/demo/products/[slug]">): Promise<Metadata> {
  const product = findProduct((await params).slug);
  return product
    ? {
        title: product.name,
        description: `${product.summary} ${product.price} for ${product.size}.`,
      }
    : {};
}

export default async function ProductPage({ params }: PageProps<"/demo/products/[slug]">) {
  const product = findProduct((await params).slug);
  if (!product) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/demo/products" className="text-muted-foreground text-sm hover:underline">
        ← All products
      </Link>
      {/* data-assistant-context: the assistant may read this public product text. */}
      <article className="flex flex-col gap-4" data-assistant-context>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <span className="text-muted-foreground text-lg" lang="ml">
            {product.malayalamName}
          </span>
          {product.inStock ? (
            <Badge variant="success">In stock</Badge>
          ) : (
            <Badge variant="warning">Out of stock</Badge>
          )}
        </div>
        <p className="text-2xl font-semibold">
          {product.price}{" "}
          <span className="text-muted-foreground text-base font-normal">for {product.size}</span>
        </p>
        <p className="text-lg">{product.summary}</p>
        <p>{product.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Category</dt>
          <dd>{product.category}</dd>
          <dt className="text-muted-foreground">Origin</dt>
          <dd>{product.origin}</dd>
          <dt className="text-muted-foreground">Heat</dt>
          <dd>{product.heat}</dd>
          <dt className="text-muted-foreground">Best for</dt>
          <dd>{product.bestFor.join(", ")}</dd>
        </dl>
      </article>
      <div className="flex flex-col gap-2">
        <Button disabled className="w-fit">
          Add to cart (disabled in demo)
        </Button>
        <p className="text-muted-foreground text-xs">
          This demo shop has no cart or checkout; it exists to show the AI assistant.
        </p>
      </div>
    </div>
  );
}
