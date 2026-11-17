import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className={buttonClasses({ variant: "secondary" })}>
        Go home
      </Link>
    </div>
  );
}
