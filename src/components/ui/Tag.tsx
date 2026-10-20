import type { ReactNode } from "react";

/** Small text labels. Tone never carries meaning alone: the words always say it. */
const tones = {
  neutral: "bg-surface-sunken text-ink-2",
  accent: "bg-primary-container text-on-primary-container",
  plum: "bg-secondary-container text-secondary",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
} as const;

export function Tag({ tone = "neutral", children, className = "" }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-tag px-2 py-0.5 text-meta font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
