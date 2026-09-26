import { z } from "zod";

/**
 * Required: the app cannot boot without these. Fail fast, fail loud.
 * Optional: capability-flagged. Missing => the feature that needs it
 * degrades to a clear "unavailable" state instead of crashing.
 */
const envSchema = z.object({
  // Core — required
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Google OAuth — optional (email+password still works without it)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe — required for billing, but app boots without it (checkout just
  // won't be offered)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Resend — optional, transactional email degrades to no-op
  RESEND_API_KEY: z.string().optional(),

  // Higgsfield (Wan 3.0 Prime) — optional, AI B-roll degrades to stock-only
  HIGGSFIELD_API_KEY: z.string().optional(),
  HIGGSFIELD_SECRET: z.string().optional(),
  HIGGSFIELD_CALLBACK: z.string().url().optional(),

  // ElevenLabs — optional, voiceover/captions degrade to "unavailable"
  ELEVENLABS_API_KEY: z.string().optional(),

  // Shotstack — optional, render/stitch degrades to "unavailable"
  SHOTSTACK_API_KEY: z.string().optional(),
  SHOTSTACK_ENV: z.enum(["stage", "v1"]).default("stage"),

  // Cron — required in production only, checked separately below
  CRON_SECRET: z.string().optional(),

  // AI Gateway (script polish) — optional
  AI_GATEWAY_API_KEY: z.string().optional(),

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
  higgsfield: Boolean(env.HIGGSFIELD_API_KEY && env.HIGGSFIELD_SECRET),
  elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
  shotstack: Boolean(env.SHOTSTACK_API_KEY),
  aiGateway: Boolean(env.AI_GATEWAY_API_KEY),
} as const;
