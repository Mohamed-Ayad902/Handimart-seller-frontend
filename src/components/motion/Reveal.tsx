"use client";

import { useRef, type ReactNode } from "react";
import { DUR, EASE, MOTION_OK, ScrollTrigger, gsap, useGSAP } from "./gsap";

/**
 * Children marked `data-reveal` rise into place as they scroll into view, a few at a time
 * (ScrollTrigger.batch, so a long page costs one observer, not one per element). Content is
 * fully visible without JavaScript or with reduced motion: elements are only hidden once the
 * animation that will show them again is set up.
 */
export function RevealGroup({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        if (!items.length) return;
        gsap.set(items, { autoAlpha: 0, y: 22 });
        ScrollTrigger.batch(items, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: DUR.long, ease: EASE, stagger: 0.07, overwrite: true }),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Tag ref={root} className={className}>
      {children}
    </Tag>
  );
}
