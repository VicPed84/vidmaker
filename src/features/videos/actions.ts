"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma, VideoStatus } from "@/generated/prisma/client";
import { hasStudioAccess, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canProduceVideos, capabilities } from "@/lib/env";
import { getVideo } from "@/features/videos/queries";
import { produceVideo, refreshVideo } from "@/features/videos/pipeline";
import { generateScript } from "@/features/videos/providers/script";
import {
  scriptInputSchema,
  scriptProblem,
  type ScriptInput,
} from "@/features/videos/scenes";

export type VideoFormState = { error?: string; success?: string };

const EDITABLE: VideoStatus[] = ["draft", "failed", "ready"];

async function requireStudioUser() {
  const user = await requireUser();
  if (!hasStudioAccess(user)) {
    throw new Error("Your account doesn't have access to the studio.");
  }
  return user;
}

function parseScript(formData: FormData): ScriptInput | string {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return "The editor sent nothing. Reload and try again.";
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return "The editor sent bad data. Reload and try again.";
  }
  const parsed = scriptInputSchema.safeParse(json);
  return parsed.success ? parsed.data : (parsed.error.issues[0]?.message ?? "Check the script.");
}

function scenesJson(script: ScriptInput): Prisma.InputJsonValue {
  return script.scenes.map((scene) => ({
    narration: scene.narration,
    visual: scene.visual,
  }));
}

export async function createVideoAction(
  _prev: VideoFormState,
  formData: FormData
): Promise<VideoFormState> {
  let user;
  try {
    user = await requireStudioUser();
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Not allowed." };
  }

  const topic = z
    .string()
    .trim()
    .min(3, "Describe the story in a few words.")
    .max(300, "Keep the topic under 300 characters.")
    .safeParse(formData.get("topic"));
  if (!topic.success) return { error: topic.error.issues[0]?.message };

  let videoId: string;
  try {
    if (capabilities.aiGateway) {
      const script = await generateScript(topic.data);
      const video = await db.video.create({
        data: {
          userId: user.id,
          topic: topic.data,
          title: script.title,
          description: script.description,
          scenes: script.scenes,
        },
      });
      videoId = video.id;
    } else {
      // No AI key: start a blank script the user writes by hand.
      const video = await db.video.create({
        data: {
          userId: user.id,
          topic: topic.data,
          title: topic.data.slice(0, 100),
          scenes: [{ narration: "", visual: "" }],
        },
      });
      videoId = video.id;
    }
  } catch (error: unknown) {
    console.error("Script generation failed", error);
    // Private tool: show the real reason so setup problems are easy to fix.
    const detail = error instanceof Error ? error.message : String(error);
    return { error: `Couldn't write the script: ${detail.slice(0, 300)}` };
  }

  revalidatePath("/studio");
  redirect(`/studio/videos/${videoId}`);
}

export async function saveScriptAction(
  videoId: string,
  _prev: VideoFormState,
  formData: FormData
): Promise<VideoFormState> {
  try {
    const user = await requireStudioUser();
    const script = parseScript(formData);
    if (typeof script === "string") return { error: script };

    const video = await getVideo(user.id, videoId);
    if (!video) return { error: "Video not found." };
    if (!EDITABLE.includes(video.status)) {
      return { error: "This video is being produced. Wait for it to finish." };
    }

    await db.video.update({
      where: { id: video.id },
      data: { title: script.title, description: script.description, scenes: scenesJson(script) },
    });
  } catch (error: unknown) {
    console.error("Save script failed", error);
    return { error: "Couldn't save. Try again." };
  }
  revalidatePath(`/studio/videos/${videoId}`);
  return { success: "Saved." };
}

export async function produceVideoAction(
  videoId: string,
  _prev: VideoFormState,
  formData: FormData
): Promise<VideoFormState> {
  if (!canProduceVideos) {
    return { error: "Video production isn't set up yet. Add the provider keys first." };
  }
  try {
    const user = await requireStudioUser();
    const script = parseScript(formData);
    if (typeof script === "string") return { error: script };
    const problem = scriptProblem(script.scenes);
    if (problem) return { error: problem };

    const video = await getVideo(user.id, videoId);
    if (!video) return { error: "Video not found." };
    if (!EDITABLE.includes(video.status)) {
      return { error: "This video is already being produced." };
    }

    await db.video.update({
      where: { id: video.id },
      data: {
        title: script.title,
        description: script.description,
        scenes: scenesJson(script),
        status: "voicing",
        errorMessage: null,
        videoUrl: null,
        shotstackRenderId: null,
      },
    });
  } catch (error: unknown) {
    console.error("Start production failed", error);
    return { error: "Couldn't start production. Try again." };
  }

  // Runs after the response is sent; the page polls for progress.
  after(() => produceVideo(videoId));
  revalidatePath(`/studio/videos/${videoId}`);
  return {};
}

/** Polled by in-progress video pages. Returns the latest status. */
export async function refreshVideoAction(videoId: string): Promise<VideoStatus | null> {
  try {
    const user = await requireStudioUser();
    const video = await getVideo(user.id, videoId);
    if (!video) return null;
    const updated = await refreshVideo(video);
    return updated.status;
  } catch (error: unknown) {
    console.error("Refresh failed", error);
    return null;
  }
}

export async function deleteVideoAction(videoId: string): Promise<void> {
  try {
    const user = await requireStudioUser();
    await db.video.deleteMany({ where: { id: videoId, userId: user.id } });
  } catch (error: unknown) {
    console.error("Delete failed", error);
  }
  revalidatePath("/studio");
  redirect("/studio");
}
