import type { VideoStatus } from "@/generated/prisma/client";

export const STATUS_LABEL: Record<VideoStatus, string> = {
  draft: "Script draft",
  voicing: "Recording voice",
  broll_generating: "Finding visuals",
  rendering: "Rendering",
  ready: "Ready",
  failed: "Failed",
};

export const IN_PROGRESS: VideoStatus[] = ["voicing", "broll_generating", "rendering"];

const TONE: Record<VideoStatus, string> = {
  draft: "border-border text-ink-muted",
  voicing: "border-warning/40 text-warning",
  broll_generating: "border-warning/40 text-warning",
  rendering: "border-warning/40 text-warning",
  ready: "border-success/40 text-success",
  failed: "border-danger/40 text-danger",
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const busy = IN_PROGRESS.includes(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs ${TONE[status]}`}
    >
      {busy ? (
        <span aria-hidden className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
