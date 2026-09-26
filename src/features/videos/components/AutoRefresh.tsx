"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { VideoStatus } from "@/generated/prisma/client";
import { refreshVideoAction } from "@/features/videos/actions";

const POLL_MS = 5000;

/** While a video is in production, polls its status and refreshes the page on change. */
export function AutoRefresh({ videoId, status }: { videoId: string; status: VideoStatus }) {
  const router = useRouter();
  const last = useRef(status);

  useEffect(() => {
    last.current = status;
    let cancelled = false;
    const timer = setInterval(async () => {
      const next = await refreshVideoAction(videoId);
      if (cancelled || !next) return;
      if (next !== last.current) {
        last.current = next;
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [videoId, status, router]);

  return null;
}
