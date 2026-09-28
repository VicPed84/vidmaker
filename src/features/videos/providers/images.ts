import "server-only";
import { createGateway, experimental_generateImage as generateImage } from "ai";
import { capabilities, env } from "@/lib/env";

/** One look for the whole video, so scenes feel like the same story. */
const STYLE =
  "Cinematic storytelling illustration, dramatic lighting, rich color, detailed, " +
  "shallow depth of field, vertical 9:16 composition, subject centered. " +
  "No text, no captions, no letters, no watermark, no logos.";

export type SceneImage = { data: Uint8Array; mediaType: string };

/** Generates one vertical illustration for a scene through the AI Gateway. */
export async function generateSceneImage(visual: string): Promise<SceneImage> {
  if (!capabilities.aiGateway || !env.AI_GATEWAY_API_KEY) {
    throw new Error("AI images are unavailable: AI_GATEWAY_API_KEY is not set.");
  }
  const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });

  const { image } = await generateImage({
    model: gateway.imageModel(env.IMAGE_MODEL),
    prompt: `${visual.trim()}\n\n${STYLE}`,
    aspectRatio: "9:16",
    maxRetries: 2,
  });

  return { data: image.uint8Array, mediaType: image.mediaType || "image/png" };
}
