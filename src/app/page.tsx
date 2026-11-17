import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";

/**
 * Neutral foundation landing page. Replace with the product's own landing page
 * once the competition problem is known. Rendered inside AppShell's <main>.
 */
export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{siteConfig.name}</h1>
      <p className="text-muted-foreground text-lg">{siteConfig.description}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
          Create an account
        </Link>
        <Link href="/sign-in" className={buttonClasses({ variant: "secondary", size: "lg" })}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
