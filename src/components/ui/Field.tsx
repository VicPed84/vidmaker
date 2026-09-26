import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const CONTROL_CLASSES = [
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink",
  "placeholder:text-ink-faint",
  "focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40",
  "disabled:opacity-60",
].join(" ");

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function Field({ label, name, hint, id, ...rest }: FieldProps) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <input id={inputId} name={name} className={CONTROL_CLASSES} {...rest} />
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
};

export function TextArea({ label, name, id, ...rest }: TextAreaProps) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <textarea
        id={inputId}
        name={name}
        className={`${CONTROL_CLASSES} resize-y`}
        {...rest}
      />
    </label>
  );
}

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
        {success}
      </p>
    );
  }
  return null;
}
