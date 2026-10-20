import type { ReactNode } from "react";

/**
 * The app's status language (Seller designsystem StatusMark / StatusTag). The tone answers "whose
 * move is it?" and the words always say it too, so colour never carries the meaning alone.
 */
export type StatusTone = "action" | "progress" | "success" | "warning" | "danger" | "neutral" | "info";

const tag: Record<StatusTone, string> = {
  action: "bg-primary-container text-on-primary-container",
  progress: "bg-secondary-container text-secondary",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
  danger: "bg-error-container text-error",
  neutral: "bg-surface-sunken text-ink-2",
  info: "bg-info-container text-info",
};

const knot: Record<StatusTone, string> = {
  action: "bg-primary",
  progress: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-error",
  neutral: "bg-ink-3",
  info: "bg-info",
};

/** Tag form, for headers and detail panels. */
export function StatusTag({ tone, children, className = "" }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-tag px-2 py-0.5 text-meta font-bold whitespace-nowrap ${tag[tone]} ${className}`}>{children}</span>;
}

/** Knot form, for dense rows: a small tied knot of colour beside the words. */
export function StatusMark({ tone, children, className = "" }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-body-sm font-bold whitespace-nowrap text-ink ${className}`}>
      <span aria-hidden="true" className={`size-2.5 rotate-45 rounded-[3px] ${knot[tone]}`} />
      {children}
    </span>
  );
}
