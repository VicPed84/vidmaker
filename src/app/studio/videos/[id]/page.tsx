import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canProduceVideos } from "@/lib/env";
import { getVideo } from "@/features/videos/queries";
import { parseScenes } from "@/features/videos/scenes";
import { deleteVideoAction } from "@/features/videos/actions";
import { AutoRefresh } from "@/features/videos/components/AutoRefresh";
import { SceneEditor } from "@/features/videos/components/SceneEditor";
import { IN_PROGRESS, STATUS_LABEL, StatusBadge } from "@/features/videos/components/StatusBadge";
import { SetupChecklist } from "@/features/videos/components/SetupChecklist";
import { Button, buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Video" };
// Production (voice + visuals + render submit) runs in this function after the action responds.
export const maxDuration = 300;

const STEPS = ["voicing", "broll_generating", "rendering", "ready"] as const;

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const video = await getVideo(user.id, id);
  if (!video) notFound();

  const scenes = parseScenes(video.scenes);
  const inProgress = IN_PROGRESS.includes(video.status);
  const stepIndex = STEPS.indexOf(video.status as (typeof STEPS)[number]);

  return (
    <div className="flex flex-col gap-8">
      {inProgress ? <AutoRefresh videoId={video.id} status={video.status} /> : null}

      <div className="flex flex-col gap-3">
        <Link href="/studio" className="text-sm text-ink-muted hover:text-ink">
          ← Studio
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl text-ink">{video.title || video.topic}</h1>
          <StatusBadge status={video.status} />
        </div>
        <p className="text-sm text-ink-muted">Topic: {video.topic}</p>
      </div>

      {inProgress ? (
        <div className="rounded-xl border border-border bg-surface p-5" aria-live="polite">
          <p className="text-ink">Making your Short. This usually takes 1–3 minutes.</p>
          <ol className="mt-4 flex flex-wrap gap-2">
            {STEPS.slice(0, 3).map((step, i) => (
              <li
                key={step}
                className={`rounded-full border px-3 py-1 font-mono text-xs ${
                  i < stepIndex
                    ? "border-success/40 text-success"
                    : i === stepIndex
                      ? "border-warning/40 text-warning"
                      : "border-border text-ink-faint"
                }`}
              >
                {i < stepIndex ? "✓ " : ""}
                {STATUS_LABEL[step]}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-muted">You can leave this page; it keeps going.</p>
        </div>
      ) : null}

      {video.status === "failed" && video.errorMessage ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {video.errorMessage}
        </p>
      ) : null}

      {video.status === "ready" && video.videoUrl ? (
        <section className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <video
            src={video.videoUrl}
            controls
            playsInline
            className="aspect-9/16 w-64 rounded-xl border border-border bg-black"
          />
          <div className="flex flex-col gap-3">
            <a href={video.videoUrl} download className={buttonClasses("primary")}>
              Download MP4
            </a>
            <p className="max-w-xs text-xs text-ink-muted">
              The render link is temporary. Download it soon and keep your own copy.
            </p>
          </div>
        </section>
      ) : null}

      {!canProduceVideos && !inProgress ? <SetupChecklist /> : null}

      <SceneEditor
        key={`${video.id}-${video.updatedAt.getTime()}`}
        videoId={video.id}
        readOnly={inProgress}
        canProduce={canProduceVideos}
        produceLabel={video.status === "ready" || video.status === "failed" ? "Remake video" : "Make video"}
        initial={{
          title: video.title,
          description: video.description,
          scenes: scenes.map((s) => ({ narration: s.narration, searchQuery: s.searchQuery })),
        }}
      />

      {!inProgress ? (
        <form action={deleteVideoAction.bind(null, video.id)} className="border-t border-border pt-6">
          <Button type="submit" variant="danger">
            Delete video
          </Button>
        </form>
      ) : null}
    </div>
  );
}
