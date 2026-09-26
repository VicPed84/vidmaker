import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/AuthForms";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="This reset link is invalid or has already been used."
      >
        <Link href="/forgot-password" className={buttonClasses("primary")}>
          Request a new link
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Set a new password">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
