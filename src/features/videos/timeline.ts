import type { Scene } from "@/features/videos/scenes";
import type { CharacterAlignment } from "@/features/videos/providers/elevenlabs";
import type {
  MotionEffect,
  ShotstackClip,
  ShotstackEdit,
} from "@/features/videos/providers/shotstack";

/** Narration is sent to TTS as the scene lines joined by this separator. */
export const SCENE_SEPARATOR = " ";
const TAIL_SECONDS = 0.8;
const MAX_CAPTION_WORDS = 3;
const MAX_CAPTION_CHARS = 20;

export function joinNarration(scenes: Pick<Scene, "narration">[]): string {
  return scenes.map((scene) => scene.narration.trim()).join(SCENE_SEPARATOR);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Uses the character timestamps to find when each scene's narration starts,
 * so every visual cut lands on its sentence. Scenes run back to back; the last
 * one holds for a short tail after the voice ends.
 */
export function timeScenes(
  scenes: Scene[],
  alignment: CharacterAlignment,
  audioDurationSec: number
): Scene[] {
  const starts: number[] = [];
  let offset = 0;
  for (const scene of scenes) {
    const index = Math.min(offset, alignment.character_start_times_seconds.length - 1);
    starts.push(alignment.character_start_times_seconds[index] ?? 0);
    offset += scene.narration.trim().length + SCENE_SEPARATOR.length;
  }
  starts[0] = 0;

  const end = audioDurationSec + TAIL_SECONDS;
  return scenes.map((scene, i) => {
    const start = starts[i] ?? 0;
    const next = starts[i + 1] ?? end;
    return { ...scene, start: round(start), length: round(Math.max(next - start, 0.5)) };
  });
}

type Word = { text: string; start: number; end: number };

function wordsFrom(alignment: CharacterAlignment): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;
  alignment.characters.forEach((char, i) => {
    const start = alignment.character_start_times_seconds[i] ?? 0;
    const end = alignment.character_end_times_seconds[i] ?? start;
    if (/\s/.test(char)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    if (current) {
      current.text += char;
      current.end = end;
    } else {
      current = { text: char, start, end };
    }
  });
  if (current) words.push(current);
  return words;
}

/** Short, punchy caption chunks (a few words at a time) timed to the voice. */
export function captionClips(alignment: CharacterAlignment): ShotstackClip[] {
  const words = wordsFrom(alignment);
  const clips: ShotstackClip[] = [];
  let chunk: Word[] = [];

  const flush = (nextStart?: number) => {
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (!first || !last) return;
    const end = nextStart !== undefined ? Math.min(nextStart, last.end + 0.3) : last.end + 0.3;
    clips.push({
      asset: {
        type: "title",
        text: chunk.map((word) => word.text).join(" ").toUpperCase(),
        style: "subtitle",
        size: "medium",
      },
      start: round(first.start),
      length: round(Math.max(end - first.start, 0.3)),
      position: "center",
      offset: { x: 0, y: -0.18 },
    });
    chunk = [];
  };

  words.forEach((word, i) => {
    chunk.push(word);
    const text = chunk.map((w) => w.text).join(" ");
    const endsSentence = /[.!?,;:]$/.test(word.text);
    if (chunk.length >= MAX_CAPTION_WORDS || text.length >= MAX_CAPTION_CHARS || endsSentence) {
      flush(words[i + 1]?.start);
    }
  });
  flush();
  return clips;
}

/** Rotating camera moves so consecutive stills don't feel the same. */
const MOTION: MotionEffect[] = ["zoomIn", "slideLeft", "zoomOut", "slideRight", "zoomIn", "slideUp"];

/**
 * Visual clips. AI images get a slow pan/zoom and a short crossfade; a stock
 * clip shorter than its scene is repeated to fill it.
 */
function visualClips(scenes: Scene[]): ShotstackClip[] {
  const clips: ShotstackClip[] = [];
  scenes.forEach((scene, index) => {
    if (scene.start === undefined || !scene.length) return;

    if (scene.imageUrl) {
      clips.push({
        asset: { type: "image", src: scene.imageUrl },
        start: round(scene.start),
        length: round(scene.length),
        fit: "cover",
        effect: MOTION[index % MOTION.length],
        ...(index > 0 ? { transition: { in: "fade" as const } } : {}),
      });
      return;
    }

    if (!scene.clipUrl) return;
    const sourceLength = scene.clipDurationSec ?? scene.length;
    let placed = 0;
    while (placed < scene.length - 0.01) {
      const length = Math.min(sourceLength, scene.length - placed);
      clips.push({
        asset: { type: "video", src: scene.clipUrl, volume: 0 },
        start: round(scene.start + placed),
        length: round(length),
        fit: "cover",
      });
      placed += length;
    }
  });
  return clips;
}

export function buildEdit(input: {
  scenes: Scene[];
  alignment: CharacterAlignment;
  audioUrl: string;
  audioDurationSec: number;
  musicUrl?: string;
}): ShotstackEdit {
  const totalLength = round(input.audioDurationSec + TAIL_SECONDS);
  return {
    timeline: {
      background: "#000000",
      ...(input.musicUrl
        ? { soundtrack: { src: input.musicUrl, effect: "fadeOut" as const, volume: 0.12 } }
        : {}),
      // Top track first: captions, then narration audio, then visuals.
      tracks: [
        { clips: captionClips(input.alignment) },
        {
          clips: [
            {
              asset: { type: "audio", src: input.audioUrl, volume: 1 },
              start: 0,
              length: totalLength,
            },
          ],
        },
        { clips: visualClips(input.scenes) },
      ],
    },
    output: { format: "mp4", size: { width: 1080, height: 1920 }, fps: 30 },
  };
}
