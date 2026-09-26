import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { SignUpForm } from "@/features/auth/components/AuthForms";
import { capabilities } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Private tool: only emails on the owner list can sign up."
      showGoogle={capabilities.googleAuth}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
