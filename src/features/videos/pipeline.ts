import "server-only";
import type { Video } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseScenes, type Scene } from "@/features/videos/scenes";
import { synthesizeNarration } from "@/features/videos/providers/elevenlabs";
import { findClip } from "@/features/videos/providers/pexels";
import { uploadNarration } from "@/features/videos/providers/storage";
import { getRenderStatus, submitRender } from "@/features/videos/providers/shotstack";
import { buildEdit, joinNarration, timeScenes } from "@/features/videos/timeline";

/** Steps that run in our own function; if one sits this long it died. */
const STALE_STEP_MS = 10 * 60 * 1000;
/** Shotstack renders a Short in a minute or two; give it plenty of room. */
const STALE_RENDER_MS = 30 * 60 * 1000;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

async function markFailed(videoId: string, error: unknown): Promise<void> {
  console.error(`Video ${videoId} failed`, error);
  try {
    await db.video.update({
      where: { id: videoId },
      data: { status: "failed", errorMessage: errorText(error).slice(0, 500) },
    });
  } catch (dbError: unknown) {
    console.error(`Could not mark video ${videoId} as failed`, dbError);
  }
}

/**
 * Voice → visuals → render submission. Runs after the "Make video" action
 * responds; the page polls for progress. Never throws: failures are written
 * to the video row so the UI can show them.
 */
export async function produceVideo(videoId: string): Promise<void> {
  try {
    const video = await db.video.findUniqueOrThrow({ where: { id: videoId } });
    const scenes = parseScenes(video.scenes);

    // 1. Narration
    const narration = await synthesizeNarration(joinNarration(scenes));
    const audioUrl = await uploadNarration(video.id, narration.audio);
    const timed = timeScenes(scenes, narration.alignment, narration.durationSec);
    await db.video.update({
      where: { id: video.id },
      data: {
        status: "broll_generating",
        elevenLabsAudioUrl: audioUrl,
        durationSec: Math.round(narration.durationSec),
        scenes: timed,
      },
    });

    // 2. One stock clip per scene, no repeats within a video
    const used = new Set<string>();
    const withClips: Scene[] = [];
    for (const scene of timed) {
      const clip = await findClip(scene.searchQuery, scene.length ?? 3, used);
      withClips.push({ ...scene, clipUrl: clip.url, clipDurationSec: clip.durationSec });
    }

    // 3. Hand the whole edit to Shotstack
    const renderId = await submitRender(
      buildEdit({
        scenes: withClips,
        alignment: narration.alignment,
        audioUrl,
        audioDurationSec: narration.durationSec,
        musicUrl: env.BACKGROUND_MUSIC_URL,
      })
    );

    await db.$transaction([
      db.video.update({
        where: { id: video.id },
        data: { status: "rendering", shotstackRenderId: renderId, scenes: withClips },
      }),
      db.usageMeter.upsert({
        where: { userId_month: { userId: video.userId, month: currentMonth() } },
        create: { userId: video.userId, month: currentMonth(), videosGenerated: 1 },
        update: { videosGenerated: { increment: 1 } },
      }),
    ]);
  } catch (error: unknown) {
    await markFailed(videoId, error);
  }
}

/**
 * Advances an in-flight video: checks Shotstack for renders and fails steps
 * that stalled. Safe to call often (page polling and the daily cron).
 */
export async function refreshVideo(video: Video): Promise<Video> {
  const age = Date.now() - video.updatedAt.getTime();
  try {
    if (video.status === "voicing" || video.status === "broll_generating") {
      if (age > STALE_STEP_MS) {
        return await db.video.update({
          where: { id: video.id },
          data: { status: "failed", errorMessage: "Production timed out. Try again." },
        });
      }
      return video;
    }

    if (video.status !== "rendering" || !video.shotstackRenderId) return video;

    const render = await getRenderStatus(video.shotstackRenderId);
    if (render.status === "done" && render.url) {
      return await db.video.update({
        where: { id: video.id },
        data: { status: "ready", videoUrl: render.url, errorMessage: null },
      });
    }
    if (render.status === "failed") {
      return await db.video.update({
        where: { id: video.id },
        data: {
          status: "failed",
          errorMessage: `Render failed: ${render.error ?? "unknown error"}`.slice(0, 500),
        },
      });
    }
    if (age > STALE_RENDER_MS) {
      return await db.video.update({
        where: { id: video.id },
        data: { status: "failed", errorMessage: "Render took too long. Try again." },
      });
    }
    return video;
  } catch (error: unknown) {
    console.error(`Could not refresh video ${video.id}`, error);
    return video;
  }
}
