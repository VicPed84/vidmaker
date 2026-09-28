import { capabilities } from "@/lib/env";

const ITEMS = [
  { key: "aiGateway", label: "AI scripts and scene images", env: "AI_GATEWAY_API_KEY", required: false },
  { key: "elevenlabs", label: "Voiceover (ElevenLabs)", env: "ELEVENLABS_API_KEY", required: true },
  { key: "pexels", label: "Stock footage fallback (Pexels)", env: "PEXELS_API_KEY", required: false },
  { key: "blob", label: "Audio storage (Vercel Blob)", env: "BLOB_STORE_ID", required: true },
  { key: "shotstack", label: "Rendering (Shotstack)", env: "SHOTSTACK_API_KEY", required: true },
] as const;

/** Shows which provider keys are still missing before videos can be made. */
export function SetupChecklist() {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
      <p className="text-ink">Finish setup to make videos</p>
      <p className="mt-1 text-sm text-ink-muted">
        Scripts work now. Add these keys in Vercel → Settings → Environment Variables, then redeploy.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {ITEMS.map((item) => {
          const on = capabilities[item.key];
          return (
            <li key={item.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span aria-hidden className={on ? "text-success" : "text-ink-faint"}>
                {on ? "●" : "○"}
              </span>
              <span className={on ? "text-ink" : "text-ink-muted"}>{item.label}</span>
              <code className="font-mono text-xs text-ink-faint">{item.env}</code>
              {!item.required ? <span className="text-xs text-ink-faint">optional</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
