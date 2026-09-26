import "server-only";
import { put } from "@vercel/blob";
import { capabilities, env } from "@/lib/env";

/** Stores narration audio publicly so the renderer can fetch it. */
export async function uploadNarration(videoId: string, audio: Buffer): Promise<string> {
  if (!capabilities.blob) {
    throw new Error("Audio storage is unavailable: connect a Vercel Blob store.");
  }
  const blob = await put(`narration/${videoId}.mp3`, audio, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: true,
    // New stores: store ID + Vercel's OIDC token. Old stores: read-write token.
    ...(env.BLOB_STORE_ID
      ? { storeId: env.BLOB_STORE_ID }
      : { token: env.BLOB_READ_WRITE_TOKEN }),
  });
  return blob.url;
}
