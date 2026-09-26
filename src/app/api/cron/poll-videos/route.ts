import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { refreshVideo } from "@/features/videos/pipeline";

/**
 * Safety net for videos nobody is watching: finishes renders and fails
 * stalled steps. Open pages poll on their own; this catches the rest.
 */
export async function GET(request: Request) {
  const expected = env.CRON_SECRET;
  if (env.NODE_ENV === "production" || expected) {
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const videos = await db.video.findMany({
      where: { status: { in: ["voicing", "broll_generating", "rendering"] } },
      take: 50,
    });
    const results = await Promise.all(videos.map((video) => refreshVideo(video)));
    return NextResponse.json({
      checked: videos.length,
      ready: results.filter((video) => video.status === "ready").length,
      failed: results.filter((video) => video.status === "failed").length,
    });
  } catch (error: unknown) {
    console.error("poll-videos cron failed", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
