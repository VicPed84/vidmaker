"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextArea } from "@/components/ui/Field";
import {
  produceVideoAction,
  saveScriptAction,
  type VideoFormState,
} from "@/features/videos/actions";
import {
  MAX_SCENES,
  TARGET_SECONDS,
  countWords,
  estimateSeconds,
  scriptProblem,
  type ScriptInput,
} from "@/features/videos/scenes";

const INITIAL: VideoFormState = {};

type Props = {
  videoId: string;
  initial: ScriptInput;
  readOnly: boolean;
  canProduce: boolean;
  produceLabel: string;
};

export function SceneEditor({ videoId, initial, readOnly, canProduce, produceLabel }: Props) {
  const [script, setScript] = useState<ScriptInput>(initial);
  const [saveState, saveAction, saving] = useActionState(
    saveScriptAction.bind(null, videoId),
    INITIAL
  );
  const [produceState, produceAction, producing] = useActionState(
    produceVideoAction.bind(null, videoId),
    INITIAL
  );

  const seconds = estimateSeconds(script.scenes);
  const words = script.scenes.reduce((sum, s) => sum + countWords(s.narration), 0);
  const problem = scriptProblem(script.scenes);
  const busy = saving || producing;

  function updateScene(index: number, field: "narration" | "visual", value: string) {
    setScript((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) => (i === index ? { ...scene, [field]: value } : scene)),
    }));
  }

  function addScene(after: number) {
    setScript((prev) => {
      const scenes = [...prev.scenes];
      scenes.splice(after + 1, 0, { narration: "", visual: "" });
      return { ...prev, scenes };
    });
  }

  function removeScene(index: number) {
    setScript((prev) => ({ ...prev, scenes: prev.scenes.filter((_, i) => i !== index) }));
  }

  function moveScene(index: number, delta: -1 | 1) {
    setScript((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.scenes.length) return prev;
      const scenes = [...prev.scenes];
      const [moved] = scenes.splice(index, 1);
      if (moved) scenes.splice(target, 0, moved);
      return { ...prev, scenes };
    });
  }

  const durationTone =
    seconds > 75 ? "text-danger" : seconds < 40 ? "text-warning" : "text-success";

  return (
    <form className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={JSON.stringify(script)} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3">
        <Metric label="Est. length" value={`${seconds}s`} tone={durationTone} />
        <Metric label="Target" value={`${TARGET_SECONDS}s`} />
        <Metric label="Words" value={String(words)} />
        <Metric label="Scenes" value={`${script.scenes.length}/${MAX_SCENES}`} />
      </div>

      <ol className="flex flex-col gap-4">
        {script.scenes.map((scene, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-tabular text-xs text-ink-muted">
                SCENE {String(i + 1).padStart(2, "0")}
              </span>
              {!readOnly ? (
                <div className="flex gap-1">
                  <IconButton label="Move up" onClick={() => moveScene(i, -1)} disabled={i === 0}>
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    onClick={() => moveScene(i, 1)}
                    disabled={i === script.scenes.length - 1}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label="Add scene below"
                    onClick={() => addScene(i)}
                    disabled={script.scenes.length >= MAX_SCENES}
                  >
                    +
                  </IconButton>
                  <IconButton
                    label="Delete scene"
                    onClick={() => removeScene(i)}
                    disabled={script.scenes.length <= 1}
                  >
                    ×
                  </IconButton>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              <TextArea
                label="Narration"
                name={`narration-${i}`}
                rows={2}
                value={scene.narration}
                readOnly={readOnly}
                placeholder="What the voice says during this scene."
                onChange={(e) => updateScene(i, "narration", e.target.value)}
              />
              <TextArea
                label="Visual"
                name={`visual-${i}`}
                rows={2}
                value={scene.visual}
                readOnly={readOnly}
                maxLength={500}
                placeholder="What the viewer sees, e.g. a lighthouse keeper staring at a stormy sea at night"
                onChange={(e) => updateScene(i, "visual", e.target.value)}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Upload title
          </span>
          <input
            value={script.title}
            readOnly={readOnly}
            maxLength={100}
            onChange={(e) => setScript((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40"
          />
        </label>
        <TextArea
          label="Upload description"
          name="description"
          rows={3}
          value={script.description}
          readOnly={readOnly}
          onChange={(e) => setScript((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      {!readOnly ? (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur">
          <FormMessage
            error={produceState.error ?? saveState.error}
            success={saveState.error || produceState.error ? undefined : saveState.success}
          />
          {problem ? <p className="text-sm text-warning">{problem}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              formAction={produceAction}
              pending={producing}
              disabled={busy || Boolean(problem) || !canProduce}
            >
              {produceLabel}
            </Button>
            <Button type="submit" variant="secondary" formAction={saveAction} pending={saving} disabled={busy}>
              Save script
            </Button>
          </div>
          <p className="text-xs text-ink-muted">
            AI can get facts wrong. Check names, dates and numbers before you post.
          </p>
        </div>
      ) : null}
    </form>
  );
}

function Metric({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">{label}</span>
      <span className={`font-tabular text-sm ${tone}`}>{value}</span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-md text-sm text-ink-muted hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"
    >
      {children}
    </button>
  );
}
