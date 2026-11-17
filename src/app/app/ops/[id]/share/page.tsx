import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, JoinLinkButtons } from "@/components/ops/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { env } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { requireUser } from "@/server/auth/session";
import { renderQrSvg } from "@/server/ops-qr";
import { getShareInfo } from "@/server/services/ops";

export const metadata: Metadata = { title: "Invite people" };

export default async function SharePage({
  params,
  searchParams,
}: PageProps<"/app/ops/[id]/share">) {
  const user = await requireUser();
  const { id } = await params;
  const { launched } = await searchParams;

  let info;
  try {
    info = await getShareInfo(user, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const url = `${env.APP_URL}/join/${info.joinToken}`;
  const { terms } = info.config;
  const invite = `You're invited to help with "${info.name}". Open this link to join and see your ${terms.tasks.toLowerCase()}: ${url}`;

  return (
    <div className="flex flex-col gap-8">
      {launched ? (
        <Alert variant="success" title="Your operation is live">
          Now invite people. They scan the code or open the link, and see their{" "}
          {terms.tasks.toLowerCase()} straight away.
        </Alert>
      ) : null}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.3em] uppercase">
            {info.name} · Invite people
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Bring everyone in with <span className="text-brand">one scan.</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Show this code on a screen or print it. Anyone who joins starts as{" "}
            {info.config.roleLabels.member} and sees what to do immediately.
          </p>
        </div>
        <Link href={`/app/ops/${info.id}`} className={buttonClasses({ size: "lg" })}>
          Go to the command centre
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
        <section
          aria-label="QR code"
          className="border-border bg-background flex flex-col items-center gap-4 rounded-3xl border p-6 shadow-[0_24px_60px_-30px_rgba(194,65,12,0.35)]"
        >
          {info.joinEnabled ? (
            <>
              <div
                className="w-full max-w-xs rounded-2xl bg-white p-4 text-black ring-1 ring-black/5 [&>svg]:h-auto [&>svg]:w-full"
                role="img"
                aria-label={`QR code that opens ${url}`}
                dangerouslySetInnerHTML={{ __html: renderQrSvg(url) }}
              />
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="bg-success inline-block size-2 rounded-full" /> Joining is open
              </p>
            </>
          ) : (
            <Alert variant="warning">
              Joining is turned off. Nobody new can join until you allow it again.
            </Alert>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="border-border bg-background flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
            <h2 className="font-semibold">Share the link</h2>
            <p
              className="bg-muted rounded-xl p-3 font-mono text-sm break-all"
              data-testid="join-url"
            >
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={url} />
              <CopyButton text={invite} label="Copy invite message" />
            </div>
          </section>

          <section className="border-border bg-background flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
            <h2 className="font-semibold">How joining works</h2>
            <ol className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li>1. Scan the code or open the link on a phone.</li>
              <li>2. Create an account (a few seconds) and tap Join.</li>
              <li>
                3. Pick a {terms.team.toLowerCase()} and see the first {terms.task.toLowerCase()}{" "}
                right away.
              </li>
            </ol>
          </section>

          <section className="border-border bg-background flex flex-col gap-2 rounded-2xl border p-5 shadow-sm">
            <h2 className="font-semibold">Link security</h2>
            <p className="text-muted-foreground text-sm">
              Make a new link if this one was shared too widely. The old one stops working at once.
            </p>
            <JoinLinkButtons operationId={info.id} enabled={info.joinEnabled} />
          </section>
        </div>
      </div>
    </div>
  );
}
