"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { createVideoAction, type VideoFormState } from "@/features/videos/actions";

const INITIAL: VideoFormState = {};

const EXAMPLES = [
  "The ship that vanished with its dinner still warm",
  "Why Napoleon was once attacked by rabbits",
  "The heist where nobody knows how the thieves got out",
];

export function NewVideoForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [state, action, pending] = useActionState(createVideoAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="topic" className="font-mono text-xs uppercase tracking-wider text-ink-muted">
        What&apos;s the story?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="topic"
          name="topic"
          required
          minLength={3}
          maxLength={300}
          placeholder={EXAMPLES[0]}
          disabled={pending}
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40 disabled:opacity-60"
        />
        <Button type="submit" pending={pending} className="py-3">
          {pending ? (aiEnabled ? "Writing script…" : "Creating…") : aiEnabled ? "Write script" : "Start script"}
        </Button>
      </div>
      <FormMessage error={state.error} />
      <p className="text-xs text-ink-muted">
        {aiEnabled
          ? "You'll get a ~60s script split into scenes. Review it, then make the video."
          : "AI script writing is off (no AI_GATEWAY_API_KEY), so you'll write the scenes yourself."}
      </p>
    </form>
  );
}
