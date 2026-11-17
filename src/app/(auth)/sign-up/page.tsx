import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_AFTER_AUTH_PATH, safeNextPath } from "@/lib/validation/auth";
import { getSessionUser } from "@/server/auth/session";
import { SignUpForm } from "../_components/sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  if (await getSessionUser()) redirect(DEFAULT_AFTER_AUTH_PATH);
  const { next } = await searchParams;
  return <SignUpForm next={safeNextPath(next)} />;
}
