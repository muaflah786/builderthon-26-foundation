import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_AFTER_AUTH_PATH, safeNextPath } from "@/lib/validation/auth";
import { getSessionUser } from "@/server/auth/session";
import { SignInForm } from "../_components/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (await getSessionUser()) redirect(DEFAULT_AFTER_AUTH_PATH);
  const { next } = await searchParams;
  return <SignInForm next={safeNextPath(next)} />;
}
