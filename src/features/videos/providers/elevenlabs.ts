import "server-only";
import { z } from "zod";
import { capabilities, env } from "@/lib/env";

const alignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number()),
  character_end_times_seconds: z.array(z.number()),
});

const responseSchema = z.object({
  audio_base64: z.string(),
  alignment: alignmentSchema.nullable().optional(),
});

export type CharacterAlignment = z.infer<typeof alignmentSchema>;

export type Narration = {
  audio: Buffer;
  alignment: CharacterAlignment;
  durationSec: number;
};

/** Text-to-speech with per-character timestamps (used for scene timing and captions). */
export async function synthesizeNarration(text: string): Promise<Narration> {
  if (!capabilities.elevenlabs || !env.ELEVENLABS_API_KEY) {
    throw new Error("Voiceover is unavailable: ELEVENLABS_API_KEY is not set.");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    env.ELEVENLABS_VOICE_ID
  )}/with-timestamps?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const parsed = responseSchema.parse(await response.json());
  if (!parsed.alignment) {
    throw new Error("ElevenLabs returned audio without timestamps.");
  }
  const ends = parsed.alignment.character_end_times_seconds;
  return {
    audio: Buffer.from(parsed.audio_base64, "base64"),
    alignment: parsed.alignment,
    durationSec: ends[ends.length - 1] ?? 0,
  };
}
