import Link from "next/link";
import { hasStudioAccess, requireUser } from "@/lib/auth";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowed = hasStudioAccess(user);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/studio" className="font-display text-lg text-ink">
            VidMaker
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" className="px-3 py-1.5">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {allowed ? (
          children
        ) : (
          <p className="rounded-lg border border-border bg-surface p-6 text-ink-muted">
            This account doesn&apos;t have studio access.
          </p>
        )}
      </main>
    </div>
  );
}
