import { siteConfig } from "@/config/site";

/**
 * Temporary Stage-1 home page. The Design System module replaces this with the
 * real app shell; the competition team replaces it with the product landing page.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-muted-foreground">{siteConfig.description}</p>
      <p className="text-sm">
        Health check:{" "}
        <a className="text-primary underline underline-offset-4" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
