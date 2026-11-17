import Link from "next/link";
import { Icon, type IconName } from "@/components/ops/icons";
import { buttonClasses } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const FLOATING: Array<{ label: string; icon: IconName; className: string }> = [
  { label: "Festival", icon: "party", className: "left-[4%] top-[14%] -rotate-6" },
  { label: "Examination", icon: "cap", className: "left-[9%] top-[58%] rotate-3" },
  { label: "Emergency", icon: "siren", className: "right-[4%] top-[22%] rotate-6" },
  { label: "Event", icon: "calendar", className: "right-[10%] top-[62%] -rotate-3" },
];

const JOURNEY: Array<{ title: string; text: string; who: string; icon: IconName }> = [
  {
    title: "Describe",
    who: "Organizer",
    icon: "pen",
    text: "Say what's happening in your own words. No forms to learn.",
  },
  {
    title: "Generate",
    who: "ORDOX",
    icon: "bolt",
    text: "Teams, places, roles and tasks are suggested for your situation.",
  },
  {
    title: "Review & launch",
    who: "Organizer",
    icon: "check",
    text: "Rename or remove anything, then launch with one tap.",
  },
  {
    title: "Join by QR",
    who: "Everyone",
    icon: "grid",
    text: "People scan one code, pick their team and see their first task.",
  },
  {
    title: "Coordinate live",
    who: "Coordinators",
    icon: "users",
    text: "Problems and late tasks show up first. Assign, resolve, move on.",
  },
  {
    title: "Close & summarise",
    who: "Organizer",
    icon: "chart",
    text: "Close the operation and get a summary built from real records.",
  },
];

const FEATURES: Array<{ title: string; text: string; icon: IconName }> = [
  {
    title: "Launch in minutes",
    text: "Turn a situation into a working operation instantly.",
    icon: "bolt",
  },
  {
    title: "Coordinate with ease",
    text: "Assign tasks, manage teams and handle issues live.",
    icon: "users",
  },
  {
    title: "Close with clarity",
    text: "Get a complete summary once the operation ends.",
    icon: "chart",
  },
];

/** ORDOX landing page. Rendered inside AppShell's <main>. */
export default function HomePage() {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden">
      {/* Soft brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-[radial-gradient(60%_80%_at_50%_100%,color-mix(in_oklab,var(--brand)_22%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="border-brand/15 pointer-events-none absolute top-[6%] left-1/2 -z-10 hidden aspect-square w-[78%] -translate-x-1/2 rounded-full border lg:block"
      />

      {FLOATING.map((f) => (
        <div
          key={f.label}
          aria-hidden="true"
          className={cn(
            "animate-float bg-background/90 absolute hidden w-28 flex-col items-center gap-2 rounded-2xl p-4 text-sm font-semibold shadow-[0_12px_40px_-12px_rgba(194,65,12,0.35)] lg:flex",
            f.className,
          )}
          style={{ animationDelay: `${FLOATING.indexOf(f) * 0.9}s` }}
        >
          <Icon name={f.icon} className="text-brand size-7" />
          {f.label}
        </div>
      ))}

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7 px-4 pt-16 pb-12 text-center sm:pt-24">
        <p className="animate-rise text-muted-foreground text-xs font-semibold tracking-[0.35em] uppercase">
          Universal operations platform
        </p>
        <h1 className="animate-rise text-5xl leading-[1.02] font-extrabold tracking-tight delay-1 sm:text-7xl">
          One platform.
          <br />
          Every <span className="text-brand">situation.</span>
        </h1>
        <p className="animate-rise text-muted-foreground max-w-xl text-lg delay-2">
          Set up, coordinate and manage temporary operations, from festivals and exams to
          emergencies, in minutes, with zero training.
        </p>
        <div className="animate-rise flex flex-wrap justify-center gap-3 delay-3">
          <Link
            href="/sign-up?next=/app/ops/new"
            className={buttonClasses({ size: "lg", className: "px-7" })}
          >
            Create an operation <Icon name="arrow" className="size-4" />
          </Link>
          <Link
            href="/sign-in?next=/app"
            className={buttonClasses({ variant: "secondary", size: "lg", className: "px-7" })}
          >
            <Icon name="grid" className="size-4" /> Join with a code
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-foreground font-medium underline">
            Sign in
          </Link>{" "}
          · Got a QR code from an organizer? Just scan it to join.
        </p>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="journey"
        className="mx-auto w-full max-w-6xl px-4 pb-16"
      >
        <div className="mb-8 text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
            How it works
          </p>
          <h2 id="journey" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            From first message to <span className="text-brand">final summary.</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-xl">
            Six simple steps. Nobody needs training: each screen shows exactly what to do next.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((step, i) => (
            <li
              key={step.title}
              className="group border-border bg-background animate-rise relative flex gap-4 rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(194,65,12,0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ animationDelay: `${0.1 + i * 0.07}s` }}
            >
              <span className="bg-brand-soft text-brand group-hover:bg-brand grid size-12 shrink-0 place-items-center rounded-xl transition-colors group-hover:text-white">
                <Icon name={step.icon} className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="text-muted-foreground block text-xs font-semibold tracking-widest uppercase">
                  Step {i + 1} · {step.who}
                </span>
                <span className="mt-0.5 block text-lg font-bold">{step.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label={`Why ${siteConfig.name}`}
        className="mx-auto w-full max-w-5xl px-4 pb-16"
      >
        <ul className="divide-border grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-4 sm:px-6">
              <span className="bg-background text-brand grid size-12 shrink-0 place-items-center rounded-full shadow-[0_8px_24px_-10px_rgba(194,65,12,0.45)]">
                <Icon name={f.icon} />
              </span>
              <span>
                <span className="block font-semibold">{f.title}</span>
                <span className="text-muted-foreground text-sm">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
