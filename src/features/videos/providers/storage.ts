import "server-only";
import { put } from "@vercel/blob";
import { capabilities, env } from "@/lib/env";

/** Uploads a public file so the renderer can fetch it; returns its URL. */
async function uploadPublic(
  pathname: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (!capabilities.blob) {
    throw new Error("File storage is unavailable: connect a Vercel Blob store.");
  }
  const blob = await put(pathname, Buffer.from(body), {
    access: "public",
    contentType,
    addRandomSuffix: true,
    // New stores: store ID + Vercel's OIDC token. Old stores: read-write token.
    ...(env.BLOB_STORE_ID
      ? { storeId: env.BLOB_STORE_ID }
      : { token: env.BLOB_READ_WRITE_TOKEN }),
  });
  return blob.url;
}

export async function uploadNarration(videoId: string, audio: Buffer): Promise<string> {
  return uploadPublic(`narration/${videoId}.mp3`, audio, "audio/mpeg");
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadSceneImage(
  videoId: string,
  sceneIndex: number,
  data: Uint8Array,
  mediaType: string
): Promise<string> {
  const ext = EXTENSIONS[mediaType] ?? "png";
  return uploadPublic(`scenes/${videoId}/${sceneIndex + 1}.${ext}`, data, mediaType);
}
