import "server-only";
import { z } from "zod";
import { capabilities, env } from "@/lib/env";

// Minimal slice of the Shotstack Edit API we use.
type VideoAsset = { type: "video"; src: string; volume: number };
type AudioAsset = { type: "audio"; src: string; volume: number };
type TitleAsset = { type: "title"; text: string; style: "subtitle"; size: "medium" };

export type ShotstackClip = {
  asset: VideoAsset | AudioAsset | TitleAsset;
  start: number;
  length: number;
  fit?: "cover";
  position?: "center" | "bottom";
  offset?: { x: number; y: number };
  trim?: number;
  transition?: { in?: "fade"; out?: "fade" };
};

export type ShotstackEdit = {
  timeline: {
    background: string;
    soundtrack?: { src: string; effect: "fadeOut"; volume: number };
    tracks: { clips: ShotstackClip[] }[];
  };
  output: { format: "mp4"; size: { width: number; height: number }; fps: number };
};

const submitSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  response: z.object({ id: z.string() }),
});

const statusSchema = z.object({
  response: z.object({
    id: z.string(),
    status: z.enum(["queued", "fetching", "preprocessing", "rendering", "saving", "done", "failed"]),
    url: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
  }),
});

export type RenderStatus = z.infer<typeof statusSchema>["response"];

function baseUrl(): string {
  return `https://api.shotstack.io/edit/${env.SHOTSTACK_ENV}`;
}

function apiKey(): string {
  if (!capabilities.shotstack || !env.SHOTSTACK_API_KEY) {
    throw new Error("Rendering is unavailable: SHOTSTACK_API_KEY is not set.");
  }
  return env.SHOTSTACK_API_KEY;
}

export async function submitRender(edit: ShotstackEdit): Promise<string> {
  const response = await fetch(`${baseUrl()}/render`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Shotstack rejected the render (${response.status}): ${detail.slice(0, 300)}`);
  }
  return submitSchema.parse(await response.json()).response.id;
}

export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  const response = await fetch(`${baseUrl()}/render/${encodeURIComponent(renderId)}`, {
    headers: { "x-api-key": apiKey() },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Shotstack status check failed (${response.status})`);
  }
  return statusSchema.parse(await response.json()).response;
}
