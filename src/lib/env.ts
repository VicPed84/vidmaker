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

/** Text (script) providers, in the default order they are tried. */
export const TEXT_PROVIDER_IDS = [
  "gateway",
  "gemini",
  "groq",
  "cerebras",
  "mistral",
  "openrouter",
] as const;
export type TextProviderId = (typeof TEXT_PROVIDER_IDS)[number];

// Comma-separated provider names; duplicates are dropped, unknown names fail
// the boot so a typo never silently disables a fallback.
const textProviderOrder = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .default(TEXT_PROVIDER_IDS.join(","))
    .transform((raw) => [
      ...new Set(
        raw
          .split(",")
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
      ),
    ])
    .pipe(z.array(z.enum(TEXT_PROVIDER_IDS)).min(1))
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

  // Script writing — optional. Any one of the keys below turns it on; with
  // several set they are tried in TEXT_PROVIDER_ORDER, falling through on a
  // rate limit or error.
  TEXT_PROVIDER_ORDER: textProviderOrder,
  // Free-tier, OpenAI-compatible providers
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: stringWithDefault("gemini-3.6-flash"),
  GROQ_API_KEY: optionalString,
  GROQ_MODEL: stringWithDefault("llama-3.3-70b-versatile"),
  CEREBRAS_API_KEY: optionalString,
  CEREBRAS_MODEL: stringWithDefault("gpt-oss-120b"),
  MISTRAL_API_KEY: optionalString,
  MISTRAL_MODEL: stringWithDefault("mistral-small-latest"),
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: stringWithDefault("openrouter/free"),

  // Vercel AI Gateway — optional; scene images need it, scripts can use it
  AI_GATEWAY_API_KEY: optionalString,
  SCRIPT_MODEL: stringWithDefault("openai/gpt-5-mini"),
  // Image model for scene illustrations (any AI Gateway image model)
  IMAGE_MODEL: stringWithDefault("bfl/flux-2-pro"),

  // ElevenLabs — optional, voiceover disabled without it
  ELEVENLABS_API_KEY: optionalString,
  // Default: "George", one of ElevenLabs' premade narrator voices
  ELEVENLABS_VOICE_ID: stringWithDefault("JBFqnCBsd6RMkjVDRZzb"),

  // Pexels — optional fallback: stock B-roll when AI images are off
  PEXELS_API_KEY: optionalString,

  // Higgsfield (Wan 3.0 Prime) — optional, reserved for AI B-roll
  HIGGSFIELD_API_KEY: optionalString,
  HIGGSFIELD_SECRET: optionalString,
  HIGGSFIELD_CALLBACK: optionalUrl,

  // Vercel Blob — optional, stores voiceover audio so the renderer can
  // fetch it. Newer stores connect with BLOB_STORE_ID (auth comes from
  // Vercel's OIDC token at runtime); older ones use BLOB_READ_WRITE_TOKEN.
  BLOB_STORE_ID: optionalString,
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
  // Script writing: the gateway or any free text provider
  scriptAi: Boolean(
    env.AI_GATEWAY_API_KEY ||
      env.GEMINI_API_KEY ||
      env.GROQ_API_KEY ||
      env.CEREBRAS_API_KEY ||
      env.MISTRAL_API_KEY ||
      env.OPENROUTER_API_KEY
  ),
  elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
  pexels: Boolean(env.PEXELS_API_KEY),
  higgsfield: Boolean(env.HIGGSFIELD_API_KEY && env.HIGGSFIELD_SECRET),
  blob: Boolean(env.BLOB_STORE_ID || env.BLOB_READ_WRITE_TOKEN),
  shotstack: Boolean(env.SHOTSTACK_API_KEY),
} as const;

/** Scene visuals: AI images through the gateway, else Pexels stock footage. */
export const visualSource: "ai-images" | "stock" | null = capabilities.aiGateway
  ? "ai-images"
  : capabilities.pexels
    ? "stock"
    : null;

/** Everything the "produce video" step needs, in one check. */
export const canProduceVideos =
  capabilities.elevenlabs &&
  capabilities.blob &&
  capabilities.shotstack &&
  visualSource !== null;
