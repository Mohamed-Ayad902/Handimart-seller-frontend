import type { ComponentProps, ReactNode } from "react";

const control =
  "h-12 w-full rounded-control border bg-surface px-3.5 text-body text-ink placeholder:text-ink-3 transition-colors duration-quick focus:border-ink disabled:opacity-60";

/** Labelled input with its hint and error wired up for screen readers. */
export function TextField({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; error?: string | null; hint?: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-meta font-bold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} ${error ? "border-error" : "border-line-strong"} ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-meta font-semibold text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-meta text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  id,
  error,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; id: string; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-meta font-bold text-ink-2">
        {label}
      </label>
      <select id={id} aria-invalid={error ? true : undefined} className={`${control} ps-3 pe-9 ${error ? "border-error" : "border-line-strong"}`} {...props}>
        {children}
      </select>
      {error && <p className="text-meta font-semibold text-error">{error}</p>}
    </div>
  );
}

export function TextArea({ label, id, error, className = "", ...props }: ComponentProps<"textarea"> & { label: string; id: string; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-meta font-bold text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className={`min-h-28 w-full rounded-control border bg-surface p-3.5 text-body text-ink placeholder:text-ink-3 focus:border-ink ${error ? "border-error" : "border-line-strong"} ${className}`}
        {...props}
      />
      {error && <p className="text-meta font-semibold text-error">{error}</p>}
    </div>
  );
}

