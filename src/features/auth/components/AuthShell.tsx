import Link from "next/link";
import { signInWithGoogleAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showGoogle = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showGoogle?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <Link href="/" className="font-display text-xl text-ink">
        VidMaker
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {showGoogle ? (
        <>
          <form action={signInWithGoogleAction}>
            <Button type="submit" variant="secondary" className="w-full">
              Continue with Google
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-ink-faint" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      {children}
      {footer ? <div className="text-sm text-ink-muted">{footer}</div> : null}
    </main>
  );
}
