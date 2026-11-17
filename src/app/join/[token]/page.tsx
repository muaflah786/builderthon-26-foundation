import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/app/(auth)/_components/sign-up-form";
import { JoinForm } from "@/components/ops/join-form";
import { Alert } from "@/components/ui/alert";
import { getSessionUser } from "@/server/auth/session";
import { getJoinInfo, requireMember } from "@/server/services/ops";

export const metadata: Metadata = { title: "Join" };

/** Public join page reached by QR code or link. Sign-up happens right here. */
export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const info = await getJoinInfo(token);

  if (!info) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <Alert variant="warning" title="This link doesn't work">
          It may have been replaced. Ask the person who invited you for a new link or QR code.
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (user) {
    const already = await requireMember(user, info.id).then(
      () => true,
      () => false,
    );
    if (already) redirect(`/app/ops/${info.id}`);
  }

  const { terms, roleLabels } = info.config;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-muted-foreground text-sm">You&apos;re invited to</p>
        <h1 className="text-2xl font-semibold tracking-tight">{info.name}</h1>
        <p className="text-muted-foreground text-sm">
          {info.organizerName ? `Organized by ${info.organizerName}` : null}
          {info.startsAt
            ? ` · starts ${info.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
            : null}
        </p>
        <p className="mt-2 text-sm">
          You&apos;ll join as <strong>{roleLabels.member}</strong> and see your{" "}
          {terms.tasks.toLowerCase()} straight away.
        </p>
      </div>

      {!info.open ? (
        <Alert variant="warning" title="Joining is closed">
          Ask the organizer to open joining again.
        </Alert>
      ) : user ? (
        <JoinForm token={token} defaultName={user.name} teams={info.teams} teamWord={terms.team} />
      ) : (
        <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
          <p className="font-medium">Create your account to join</p>
          <p className="text-muted-foreground text-sm">
            It takes a few seconds. You&apos;ll come straight back here.
          </p>
          <SignUpForm next={`/join/${token}`} />
        </div>
      )}

      <Link href="/" className="text-muted-foreground text-center text-sm underline">
        What is this?
      </Link>
    </div>
  );
}
