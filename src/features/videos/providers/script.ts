import "server-only";
import { z } from "zod";
import { capabilities } from "@/lib/env";
import { generateStructured } from "@/features/videos/providers/llm";
import { TARGET_SECONDS, WORDS_PER_SECOND } from "@/features/videos/scenes";

const generatedScriptSchema = z.object({
  title: z.string().describe("YouTube Shorts title, under 70 characters, honest, no clickbait lies"),
  description: z
    .string()
    .describe("Two-sentence video description followed by 3-5 hashtags including #shorts"),
  scenes: z
    .array(
      z.object({
        narration: z.string().describe("One or two spoken sentences for this scene"),
        visual: z
          .string()
          .describe(
            "One-sentence image description for this scene: subject, setting, era, mood and camera angle, specific to the story (e.g. 'Napoleon in a green coat on a muddy field at dusk, dozens of rabbits rushing toward his boots, low angle'). No text or captions in the image."
          ),
      })
    )
    .describe("6-8 scenes"),
});

export type GeneratedScript = z.infer<typeof generatedScriptSchema>;

const TARGET_WORDS = Math.round(TARGET_SECONDS * WORDS_PER_SECOND);

// Spelled out in the prompt because providers on plain JSON mode never see
// the schema or its field descriptions.
const OUTPUT_FORMAT = [
  "Respond with a single JSON object and nothing else, shaped exactly like this:",
  '{"title": string, "description": string, "scenes": [{"narration": string, "visual": string}]}',
  "title: a YouTube Shorts title under 70 characters, honest, no clickbait lies.",
  "description: a two-sentence video description followed by 3-5 hashtags including #shorts.",
  "narration: one or two spoken sentences for the scene.",
  "visual: a one-sentence image description for the scene covering subject, setting, era, mood and camera angle, specific to the story (e.g. 'Napoleon in a green coat on a muddy field at dusk, dozens of rabbits rushing toward his boots, low angle'). No text or captions in the image.",
].join("\n");

export async function generateScript(topic: string): Promise<GeneratedScript> {
  if (!capabilities.scriptAi) {
    throw new Error(
      "Script generation is unavailable: set AI_GATEWAY_API_KEY or a free key such as GEMINI_API_KEY."
    );
  }

  const { object } = await generateStructured({
    schema: generatedScriptSchema,
    system: [
      "You write narration for faceless YouTube Shorts in the storytelling niche: surprising facts, history, mysteries and true-crime style stories.",
      `The full narration must be about ${TARGET_WORDS} words (roughly ${TARGET_SECONDS} seconds spoken).`,
      "Open with a hook in the first sentence that makes the viewer need the ending. Build tension, then pay it off. End with a line that invites a comment or rewatch.",
      "Write for the ear: short sentences, plain words, no stage directions, no emojis, no hashtags in the narration.",
      "Use only well-documented facts. If a detail is uncertain or disputed, leave it out or say it is disputed. Never invent names, dates, quotes or numbers.",
      "Split the narration into 6-8 scenes; each scene gets one illustration. Describe visuals concretely and keep characters, clothing and era consistent from scene to scene.",
      OUTPUT_FORMAT,
    ].join("\n"),
    prompt: `Topic: ${topic}`,
  });

  if (object.scenes.length === 0) {
    throw new Error("The AI returned a script with no scenes. Try again.");
  }
  return { ...object, scenes: object.scenes.slice(0, 12) };
}
