import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { SignInForm } from "@/features/auth/components/AuthForms";
import { capabilities } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const { reset, error } = await searchParams;
  const notice = reset
    ? "Password updated. Sign in with your new password."
    : error
      ? "That sign-in didn't work. This app only accepts its owner's account."
      : undefined;
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Your Shorts are waiting."
      showGoogle={capabilities.googleAuth}
      footer={
        <>
          First time here?{" "}
          <Link href="/sign-up" className="text-ink underline-offset-4 hover:underline">
            Create the owner account
          </Link>
        </>
      }
    >
      <SignInForm notice={notice} />
    </AuthShell>
  );
}
