"use client";

import { useMemo, useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { formatPrice } from "@/lib/format";
import type { EarningsBucket } from "./api";

const W = 320;
const H = 96;
const PAD = 8;

const dayName = new Intl.DateTimeFormat("ar-EG", { weekday: "short" });

/**
 * Earnings as one thread across the week: the line sews itself in when it scrolls into view and
 * a knot marks each day. A visually hidden table carries the same numbers for screen readers.
 */
export function ThreadChart({ buckets: raw }: { buckets: EarningsBucket[] }) {
  const root = useRef<HTMLDivElement>(null);
  const buckets = useMemo(() => [...raw].sort((a, b) => a.date.localeCompare(b.date)), [raw]);
  const { path, points } = useMemo(() => {
    const max = Math.max(1, ...buckets.map((b) => b.amount));
    const step = buckets.length > 1 ? (W - PAD * 2) / (buckets.length - 1) : 0;
    // RTL: the oldest day sits on the right, today on the left.
    const pts = buckets.map((b, i) => ({ x: W - PAD - i * step, y: H - PAD - (b.amount / max) * (H - PAD * 2), b }));
    const d = pts.map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const prev = pts[i - 1]!;
      const cx = (prev.x + p.x) / 2;
      return `C${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    });
    return { path: d.join(" "), points: pts };
  }, [buckets]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const line = root.current?.querySelector<SVGPathElement>("[data-thread]");
        if (!line) return;
        const len = line.getTotalLength();
        gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", scrollTrigger: { trigger: root.current, start: "top 90%", once: true } });
        gsap.from("[data-knot]", { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)", stagger: 0.08, delay: 0.5, scrollTrigger: { trigger: root.current, start: "top 90%", once: true } });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [path] },
  );

  const total = buckets.reduce((s, b) => s + b.amount, 0);

  return (
    <div ref={root}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full overflow-visible" aria-hidden="true">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--hm-border-strong)" strokeWidth="1.5" strokeDasharray="6 5" />
        <path data-thread="" d={path} fill="none" stroke="var(--hm-primary)" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.b.date + (p.b.hour ?? "")} data-knot="" cx={p.x} cy={p.y} r={p.b.amount > 0 ? 3.5 : 2.5} fill={p.b.amount > 0 ? "var(--hm-primary)" : "var(--hm-border-strong)"} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[0.6875rem] font-semibold text-ink-3" aria-hidden="true">
        {points.map((p) => (
          <span key={p.b.date}>{dayName.format(new Date(p.b.date))}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>أرباحك في آخر 7 أيام، الإجمالي {formatPrice(total)}</caption>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.date}>
              <th scope="row">{dayName.format(new Date(b.date))}</th>
              <td>{formatPrice(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
