"use client";

import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "./gsap";

/**
 * A figure that counts up to its value the first time it is seen, so the eye lands on what
 * changed. Screen readers and reduced motion get the final value straight away (the real text
 * is always in the DOM; only the visible digits tween).
 */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const state = { n: 0 };
        el.textContent = format(0);
        const tween = gsap.to(state, {
          n: value,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 95%", once: true },
          onUpdate: () => {
            el.textContent = format(Number.isInteger(value) ? Math.round(state.n) : state.n);
          },
          onComplete: () => {
            el.textContent = format(value);
          },
        });
        return () => {
          tween.kill();
          el.textContent = format(value);
        };
      });
      return () => mm.revert();
    },
    { dependencies: [value] },
  );

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
