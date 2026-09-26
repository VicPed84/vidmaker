import { z } from "zod";

/** Spoken pace used for duration estimates (≈155 words per minute). */
export const WORDS_PER_SECOND = 2.6;
export const TARGET_SECONDS = 60;
export const MAX_SCENES = 12;

export const sceneSchema = z.object({
  narration: z.string().trim().max(600),
  // Short, concrete stock-footage search, e.g. "stormy ocean night"
  searchQuery: z.string().trim().max(80),
  // Filled in during production
  clipUrl: z.string().url().optional(),
  clipDurationSec: z.number().positive().optional(),
  start: z.number().nonnegative().optional(),
  length: z.number().positive().optional(),
});

export type Scene = z.infer<typeof sceneSchema>;

export const scenesSchema = z.array(sceneSchema).min(1).max(MAX_SCENES);

/** Editable script fields as submitted from the scene editor. */
export const scriptInputSchema = z.object({
  title: z.string().trim().max(100),
  description: z.string().trim().max(2000),
  scenes: z
    .array(sceneSchema.pick({ narration: true, searchQuery: true }))
    .min(1, "Add at least one scene.")
    .max(MAX_SCENES, `Keep it to ${MAX_SCENES} scenes or fewer.`),
});

export type ScriptInput = z.infer<typeof scriptInputSchema>;

/** Safely read the JSON column; bad data becomes an empty list. */
export function parseScenes(value: unknown): Scene[] {
  const parsed = scenesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function estimateSeconds(scenes: Pick<Scene, "narration">[]): number {
  const words = scenes.reduce((sum, scene) => sum + countWords(scene.narration), 0);
  return Math.round(words / WORDS_PER_SECOND);
}

/** Why a script can't be produced yet, or null if it's ready. */
export function scriptProblem(scenes: Pick<Scene, "narration" | "searchQuery">[]): string | null {
  if (scenes.length === 0) return "Add at least one scene.";
  const emptyNarration = scenes.findIndex((scene) => !scene.narration.trim());
  if (emptyNarration !== -1) return `Scene ${emptyNarration + 1} has no narration.`;
  const emptyQuery = scenes.findIndex((scene) => !scene.searchQuery.trim());
  if (emptyQuery !== -1) return `Scene ${emptyQuery + 1} needs a visual search.`;
  const seconds = estimateSeconds(scenes);
  if (seconds > 75) return `About ${seconds}s of narration. Trim it under 75s for a Short.`;
  return null;
}
