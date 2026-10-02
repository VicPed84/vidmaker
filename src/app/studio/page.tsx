import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canProduceVideos, capabilities } from "@/lib/env";
import { listVideos, videoStats } from "@/features/videos/queries";
import { NewVideoForm } from "@/features/videos/components/NewVideoForm";
import { StatusBadge } from "@/features/videos/components/StatusBadge";
import { SetupChecklist } from "@/features/videos/components/SetupChecklist";

export const metadata: Metadata = { title: "Studio" };

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function StudioPage() {
  const user = await requireUser();
  const [videos, stats] = await Promise.all([listVideos(user.id), videoStats(user.id)]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl text-ink">New Short</h1>
          <div className="text-right">
            <p className="font-tabular text-3xl text-ink">{stats.thisMonth}</p>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
              Videos made this month
            </p>
          </div>
        </div>
        <NewVideoForm aiEnabled={capabilities.scriptAi} />
        {!canProduceVideos ? <SetupChecklist /> : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink">
          Library <span className="font-tabular text-base text-ink-muted">{stats.ready} ready</span>
        </h2>
        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-ink">Your finished Shorts will show up here.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Type a story idea above to write your first script.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {videos.map((video) => (
              <li key={video.id}>
                <Link
                  href={`/studio/videos/${video.id}`}
                  className="flex items-center justify-between gap-4 bg-surface px-4 py-3 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                >
                  <div className="min-w-0">
                    <p className="truncate text-ink">{video.title || video.topic}</p>
                    <p className="font-tabular text-xs text-ink-muted">
                      {DATE.format(video.createdAt)}
                      {video.durationSec ? ` · ${video.durationSec}s` : ""}
                    </p>
                  </div>
                  <StatusBadge status={video.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
