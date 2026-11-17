import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonClasses } from "@/components/ui/button";
import { SCENARIO_PACKS } from "@/lib/ops/scenarios/packs";

const STEPS = [
  { title: "Describe it", text: "Say what's happening in your own words." },
  { title: "Check the setup", text: "Teams, places and tasks are suggested. Change anything." },
  { title: "Share one code", text: "People scan it, join, and see what to do." },
  { title: "Run it live", text: "Problems and late tasks show up first." },
];

/** Scenario-neutral product landing page. Rendered inside AppShell's <main>. */
export default function HomePage() {
  const situations = SCENARIO_PACKS.map((p) => p.name);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="flex flex-col gap-4">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">
          One platform. Every situation.
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{siteConfig.name}</h1>
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
          One platform. <span className="text-primary">Every situation.</span>
        </p>
        <p className="text-muted-foreground text-lg">
          Organize any one-day operation in minutes. Nobody needs training: everyone opens one link
          and sees exactly what to do.
        </p>
        <p className="text-sm">
          Works for {situations.slice(0, -1).join(", ").toLowerCase()}, and anything else you can
          describe.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up?next=/app/ops/new" className={buttonClasses({ size: "lg" })}>
            Create an account
          </Link>
          <Link href="/sign-in" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Sign in
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">
          Got a QR code or link from an organizer? Just open it to join.
        </p>
      </div>
      <ol className="grid gap-6 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm tabular-nums">{i + 1}</span>
            <span className="font-medium">{s.title}</span>
            <span className="text-muted-foreground text-sm">{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
