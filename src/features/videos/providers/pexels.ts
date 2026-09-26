import "server-only";
import { z } from "zod";
import { capabilities, env } from "@/lib/env";

const videoFileSchema = z.object({
  link: z.string().url(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  file_type: z.string().nullable(),
});

const searchSchema = z.object({
  videos: z.array(
    z.object({
      id: z.number(),
      duration: z.number(),
      video_files: z.array(videoFileSchema),
    })
  ),
});

type PexelsVideo = z.infer<typeof searchSchema>["videos"][number];

export type StockClip = { url: string; durationSec: number };

async function search(query: string, orientation: "portrait" | "landscape"): Promise<PexelsVideo[]> {
  const params = new URLSearchParams({ query, orientation, size: "medium", per_page: "15" });
  const response = await fetch(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: env.PEXELS_API_KEY ?? "" },
  });
  if (!response.ok) {
    throw new Error(`Pexels search failed (${response.status}) for "${query}"`);
  }
  return searchSchema.parse(await response.json()).videos;
}

/** Best MP4 rendition for a 1080x1920 frame: at least 720p tall, as close to 1920 as possible. */
function bestFile(video: PexelsVideo): string | null {
  const mp4s = video.video_files.filter(
    (file) => file.file_type === "video/mp4" && file.height && file.width
  );
  const sorted = mp4s.sort(
    (a, b) => Math.abs((a.height ?? 0) - 1920) - Math.abs((b.height ?? 0) - 1920)
  );
  const good = sorted.find((file) => (file.height ?? 0) >= 720);
  return (good ?? sorted[0])?.link ?? null;
}

/**
 * Finds a stock clip for a scene. Prefers portrait clips long enough to cover
 * the scene, skips clips already used in this video, and falls back to
 * landscape footage (the renderer crops it to fill the frame).
 */
export async function findClip(
  query: string,
  minDurationSec: number,
  exclude: Set<string>
): Promise<StockClip> {
  if (!capabilities.pexels) {
    throw new Error("Stock visuals are unavailable: PEXELS_API_KEY is not set.");
  }

  for (const orientation of ["portrait", "landscape"] as const) {
    const videos = await search(query, orientation);
    const fresh = videos.filter((video) => !exclude.has(String(video.id)));
    const longEnough = fresh.filter((video) => video.duration >= minDurationSec);
    const pick = longEnough[0] ?? fresh.sort((a, b) => b.duration - a.duration)[0];
    const link = pick ? bestFile(pick) : null;
    if (pick && link) {
      exclude.add(String(pick.id));
      return { url: link, durationSec: pick.duration };
    }
  }
  throw new Error(`No stock footage found for "${query}". Try a simpler visual search.`);
}
