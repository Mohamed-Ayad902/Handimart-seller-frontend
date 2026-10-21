"use client";

import { m } from "motion/react";

/** On/off switch. Orange is for a page's one main switch; lists of them use plum. */
export function Switch({ on, busy = false, label, onToggle, tone = "primary" }: { on: boolean; busy?: boolean; label: string; onToggle: () => void; tone?: "primary" | "secondary" }) {
  const track = tone === "primary" ? "border-primary bg-primary" : "border-secondary bg-secondary";
  const knob = tone === "primary" ? "bg-on-primary" : "bg-on-secondary";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onToggle}
      className={`relative h-8 w-14 shrink-0 rounded-full border-[1.5px] transition-colors duration-standard ${on ? track : "border-line-strong bg-surface-sunken"} disabled:opacity-60`}
    >
      <m.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }} className={`absolute top-1 size-5 rounded-full shadow-sm ${on ? `end-1 ${knob}` : "start-1 bg-ink-2"}`} />
    </button>
  );
}
