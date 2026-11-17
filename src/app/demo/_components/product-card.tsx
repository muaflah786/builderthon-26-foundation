import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DemoProduct } from "@/assistant-sites/malabar-spice/catalog";

export function ProductCard({ product }: { product: DemoProduct }) {
  return (
    <Link
      href={`/demo/products/${product.slug}`}
      className="border-border hover:bg-muted/50 flex flex-col gap-2 rounded-lg border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-muted-foreground text-sm" lang="ml">
            {product.malayalamName}
          </p>
        </div>
        {product.inStock ? null : <Badge variant="warning">Out of stock</Badge>}
      </div>
      <p className="text-muted-foreground text-sm">{product.summary}</p>
      <p className="mt-auto text-sm font-medium">
        {product.price} <span className="text-muted-foreground font-normal">· {product.size}</span>
      </p>
    </Link>
  );
}
