import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway, generateObject, type LanguageModel } from "ai";
import type { z } from "zod";
import { env, type TextProviderId } from "@/lib/env";

/**
 * Provider-agnostic text generation with fallback.
 *
 * Every provider here speaks the OpenAI chat API, so adding one is a row in
 * OPENAI_COMPATIBLE plus two env vars. Providers are tried in
 * `TEXT_PROVIDER_ORDER`; a rate limit, outage or malformed answer on one moves
 * on to the next instead of failing the request.
 */

/** Long enough for a slow reasoning model, short enough to leave room for a fallback. */
const ATTEMPT_TIMEOUT_MS = 45_000;

type OpenAICompatibleId = Exclude<TextProviderId, "gateway">;

const OPENAI_COMPATIBLE: Record<
  OpenAICompatibleId,
  { label: string; baseURL: string; apiKey: string | undefined; model: string }
> = {
  gemini: {
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  },
  groq: {
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
  },
  cerebras: {
    label: "Cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    apiKey: env.CEREBRAS_API_KEY,
    model: env.CEREBRAS_MODEL,
  },
  mistral: {
    label: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKey: env.MISTRAL_API_KEY,
    model: env.MISTRAL_MODEL,
  },
  openrouter: {
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
  },
};

export type TextProvider = {
  id: TextProviderId;
  label: string;
  modelId: string;
  model: LanguageModel;
};

function buildProvider(id: TextProviderId): TextProvider | null {
  if (id === "gateway") {
    if (!env.AI_GATEWAY_API_KEY) return null;
    const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
    return {
      id,
      label: "Vercel AI Gateway",
      modelId: env.SCRIPT_MODEL,
      model: gateway(env.SCRIPT_MODEL),
    };
  }
  const config = OPENAI_COMPATIBLE[id];
  if (!config.apiKey) return null;
  // Structured outputs stay off: these endpoints get plain JSON mode, which
  // every one of them supports. The caller's prompt must describe the shape.
  const provider = createOpenAICompatible({
    name: id,
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
  return { id, label: config.label, modelId: config.model, model: provider(config.model) };
}

/** Configured text providers, in the order they will be tried. */
export function textProviders(): TextProvider[] {
  return env.TEXT_PROVIDER_ORDER.map(buildProvider).filter(
    (provider): provider is TextProvider => provider !== null
  );
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 200);
}

export type StructuredResult<T> = { object: T; provider: TextProviderId; modelId: string };

/**
 * Generate an object matching `schema`, trying each configured provider in
 * turn. The system prompt must spell out the JSON shape: providers without
 * the gateway only get JSON mode, not the schema itself.
 */
export async function generateStructured<T>(options: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<StructuredResult<T>> {
  const providers = textProviders();
  if (providers.length === 0) {
    throw new Error(
      "No text AI provider is configured. Set AI_GATEWAY_API_KEY or a free key such as GEMINI_API_KEY or GROQ_API_KEY."
    );
  }

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const { object } = await generateObject({
        model: provider.model,
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      return { object, provider: provider.id, modelId: provider.modelId };
    } catch (error: unknown) {
      const detail = errorMessage(error);
      console.warn(`Text provider ${provider.id} (${provider.modelId}) failed: ${detail}`);
      failures.push(`${provider.label}: ${detail}`);
    }
  }

  throw new Error(`Every text AI provider failed. ${failures.join(" | ")}`);
}
