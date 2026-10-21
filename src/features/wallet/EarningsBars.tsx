"use client";

import { useMemo, useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { formatPrice } from "@/lib/format";
import type { EarningsBucket } from "@/features/home/api";

const dayFormat = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("ar-EG", { weekday: "short", timeZone: "UTC" });

/** The backend buckets in UTC: a day is a `yyyy-mm-dd` date, an hour is 0-23 of that day. */
function bucketLabel(b: EarningsBucket, count: number) {
  if (b.hour != null) return `${String(b.hour).padStart(2, "0")}:00`;
  const d = new Date(`${b.date}T00:00:00Z`);
  return count <= 7 ? weekday.format(d) : dayFormat.format(d);
}

/**
 * Earnings per day (or per hour for a single day) as bars that rise from a stitched baseline
 * when the chart comes into view. Each bar is focusable and names its own figure; a visually
 * hidden table carries every number for screen readers. Oldest on the right (RTL reading order).
 */
export function EarningsBars({ buckets: raw, caption }: { buckets: EarningsBucket[]; caption: string }) {
  const root = useRef<HTMLDivElement>(null);
  const buckets = useMemo(() => [...raw].sort((a, b) => a.date.localeCompare(b.date) || (a.hour ?? 0) - (b.hour ?? 0)), [raw]);
  const max = Math.max(1, ...buckets.map((b) => b.amount));
  const best = buckets.reduce<EarningsBucket | null>((m, b) => (b.amount > (m?.amount ?? 0) ? b : m), null);
  // Show about seven labels whatever the range, so they never collide.
  const every = Math.max(1, Math.ceil(buckets.length / 7));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-bar]", {
          scaleY: 0,
          transformOrigin: "50% 100%",
          duration: 0.7,
          ease: "power3.out",
          stagger: { each: Math.min(0.04, 0.8 / buckets.length) },
          scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [buckets] },
  );

  return (
    <div ref={root}>
      <div className="relative flex h-48 items-end gap-[3px] sm:h-56 sm:gap-1.5" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f) => (
          <span key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-divider" style={{ bottom: `${f * 100}%` }} />
        ))}
        {buckets.map((b) => {
          const h = b.amount > 0 ? Math.max(4, (b.amount / max) * 100) : 1.5;
          const top = b === best;
          return (
            <div key={b.date + (b.hour ?? "")} className="group relative flex h-full flex-1 items-end justify-center">
              <span
                data-bar=""
                className={`block w-full max-w-10 rounded-t-[6px] transition-[filter,background-color] duration-quick ${b.amount > 0 ? (top ? "bg-primary" : "bg-secondary/80 group-hover:bg-secondary") : "bg-line-strong"}`}
                style={{ height: `${h}%` }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden -translate-y-0 rounded-tag bg-inverse px-2 py-1 text-[0.75rem] font-bold whitespace-nowrap text-on-inverse group-hover:block">
                {bucketLabel(b, buckets.length)} · {formatPrice(b.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="stitch mt-1.5 opacity-80" aria-hidden="true" />
      <div className="mt-2 flex gap-[3px] text-[0.6875rem] font-semibold text-ink-3 sm:gap-1.5" aria-hidden="true">
        {buckets.map((b, i) => (
          <span key={b.date + (b.hour ?? "")} className="flex-1 text-center whitespace-nowrap">
            {i % every === 0 ? bucketLabel(b, buckets.length) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.date + (b.hour ?? "")}>
              <th scope="row">{b.hour != null ? `الساعة ${b.hour}` : dayFormat.format(new Date(`${b.date}T00:00:00Z`))}</th>
              <td>{formatPrice(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
