import "server-only";
import type { Video } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function listVideos(userId: string): Promise<Video[]> {
  return db.video.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Scoped to the owner, so one user can never load another's video. */
export async function getVideo(userId: string, id: string): Promise<Video | null> {
  return db.video.findFirst({ where: { id, userId } });
}

export async function videoStats(
  userId: string
): Promise<{ thisMonth: number; ready: number }> {
  const month = new Date().toISOString().slice(0, 7);
  const [meter, ready] = await Promise.all([
    db.usageMeter.findUnique({ where: { userId_month: { userId, month } } }),
    db.video.count({ where: { userId, status: "ready" } }),
  ]);
  return { thisMonth: meter?.videosGenerated ?? 0, ready };
}
