import { z } from "zod";

/**
 * Required: the app cannot boot without these. Fail fast, fail loud.
 * Optional: capability-flagged. Missing => the feature that needs it
 * degrades to a clear "unavailable" state instead of crashing.
 */

// Treat `KEY=` (empty string, as copied from .env.example) as "not set".
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const stringWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().default(fallback));

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);

const envSchema = z.object({
  // Core — required
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Private-tool lock: only these emails may create an account
  // (comma-separated). Required so the app is never accidentally open.
  OWNER_EMAILS: z
    .string()
    .min(3)
    .transform((raw) =>
      raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),

  // Google OAuth — optional (email+password still works without it)
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // Stripe — optional; billing is deferred while this is a private tool
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_ID: optionalString,

  // Resend — optional, transactional email (password reset) degrades to a
  // server log line
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: stringWithDefault("VidMaker <onboarding@resend.dev>"),

  // Vercel AI Gateway — optional, script generation disabled without it
  AI_GATEWAY_API_KEY: optionalString,
  SCRIPT_MODEL: stringWithDefault("openai/gpt-5-mini"),

  // ElevenLabs — optional, voiceover disabled without it
  ELEVENLABS_API_KEY: optionalString,
  // Default: "George", one of ElevenLabs' premade narrator voices
  ELEVENLABS_VOICE_ID: stringWithDefault("JBFqnCBsd6RMkjVDRZzb"),

  // Pexels — optional, stock B-roll disabled without it
  PEXELS_API_KEY: optionalString,

  // Higgsfield (Wan 3.0 Prime) — optional, reserved for AI B-roll
  HIGGSFIELD_API_KEY: optionalString,
  HIGGSFIELD_SECRET: optionalString,
  HIGGSFIELD_CALLBACK: optionalUrl,

  // Vercel Blob — optional, stores voiceover audio so the renderer can
  // fetch it
  BLOB_READ_WRITE_TOKEN: optionalString,

  // Shotstack — optional, render/stitch disabled without it
  SHOTSTACK_API_KEY: optionalString,
  SHOTSTACK_ENV: z.preprocess(emptyToUndefined, z.enum(["stage", "v1"]).default("v1")),

  // Optional background music track (a public MP3 URL you have rights to)
  BACKGROUND_MUSIC_URL: optionalUrl,

  // Cron — required in production only, checked separately below
  CRON_SECRET: optionalString,

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Invalid environment variables — see log above.");
}

export const env = parsed.data;

// Fail closed in production if CRON_SECRET is missing — cron routes must
// never run unguarded in prod.
if (env.NODE_ENV === "production" && !env.CRON_SECRET) {
  throw new Error("CRON_SECRET is required in production.");
}

/**
 * Capability flags — check these before touching a given provider so a
 * missing key degrades the feature instead of throwing deep in a call stack.
 */
export const capabilities = {
  googleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  email: Boolean(env.RESEND_API_KEY),
  aiGateway: Boolean(env.AI_GATEWAY_API_KEY),
  elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
  pexels: Boolean(env.PEXELS_API_KEY),
  higgsfield: Boolean(env.HIGGSFIELD_API_KEY && env.HIGGSFIELD_SECRET),
  blob: Boolean(env.BLOB_READ_WRITE_TOKEN),
  shotstack: Boolean(env.SHOTSTACK_API_KEY),
} as const;

/** Everything the "produce video" step needs, in one check. */
export const canProduceVideos =
  capabilities.elevenlabs &&
  capabilities.pexels &&
  capabilities.blob &&
  capabilities.shotstack;
