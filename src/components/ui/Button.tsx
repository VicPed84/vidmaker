import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-surface-raised disabled:text-ink-muted",
  secondary:
    "border border-border bg-surface text-ink hover:bg-surface-raised disabled:text-ink-muted",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface disabled:opacity-50",
  danger:
    "border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-50",
};

export function buttonClasses(variant: Variant = "primary"): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pending?: boolean;
};

export function Button({
  variant = "primary",
  pending = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonClasses(variant)} ${className}`}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
}
