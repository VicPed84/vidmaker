import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { buttonClasses } from "@/components/ui/Button";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/studio");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Private studio</p>
      <h1 className="font-display text-5xl leading-tight text-ink sm:text-6xl">
        Type a story. Get a finished Short.
      </h1>
      <p className="max-w-lg text-lg text-ink-muted">
        Script, narration, visuals and captions, stitched into a 60-second vertical video
        that&apos;s ready to upload.
      </p>
      <div>
        <Link href="/sign-in" className={buttonClasses("primary")}>
          Sign in to the studio
        </Link>
      </div>
    </main>
  );
}
