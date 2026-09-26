import "server-only";
import { put } from "@vercel/blob";
import { capabilities, env } from "@/lib/env";

/** Stores narration audio publicly so the renderer can fetch it. */
export async function uploadNarration(videoId: string, audio: Buffer): Promise<string> {
  if (!capabilities.blob) {
    throw new Error("Audio storage is unavailable: BLOB_READ_WRITE_TOKEN is not set.");
  }
  const blob = await put(`narration/${videoId}.mp3`, audio, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: true,
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}
