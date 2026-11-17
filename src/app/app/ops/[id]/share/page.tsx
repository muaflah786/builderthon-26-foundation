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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {launched ? (
        <Alert variant="success" title="Your operation is live">
          Now invite people. They scan the code or open the link, and see their{" "}
          {terms.tasks.toLowerCase()} straight away.
        </Alert>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invite people to {info.name}</h1>
        <p className="text-muted-foreground text-sm">
          Show this code on a screen or print it. Anyone who joins starts as{" "}
          {info.config.roleLabels.member}.
        </p>
      </div>

      {info.joinEnabled ? (
        <div
          className="mx-auto w-full max-w-xs rounded-lg bg-white p-4 text-black [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR code that opens ${url}`}
          dangerouslySetInnerHTML={{ __html: renderQrSvg(url) }}
        />
      ) : (
        <Alert variant="warning">
          Joining is turned off. Nobody new can join until you allow it again.
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <p className="bg-muted rounded-md p-3 font-mono text-sm break-all" data-testid="join-url">
          {url}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={url} />
          <CopyButton text={invite} label="Copy invite message" />
        </div>
      </div>

      <JoinLinkButtons operationId={info.id} enabled={info.joinEnabled} />

      <Link href={`/app/ops/${info.id}`} className={buttonClasses({ size: "lg" })}>
        Go to the command centre
      </Link>
    </div>
  );
}
