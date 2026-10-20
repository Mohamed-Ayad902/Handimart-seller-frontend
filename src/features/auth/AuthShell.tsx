"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/LogoMark";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";

const ThreadShader = dynamic(() => import("./shader/ThreadShader"), { ssr: false });

interface Nav extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/**
 * The sign-in pages: the form on paper, and beside it (above it on phones) a plum panel where
 * loose threads drift and gather toward the pointer. The panel is the one expressive moment of
 * the site; the dashboard behind it stays calm. The shader loads after the page is idle and not
 * at all on data-saver or very low-memory devices; the plum panel alone is the fallback.
 */
export function AuthShell({ children, line }: { children: ReactNode; line: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const [shader, setShader] = useState(false);

  useEffect(() => {
    const nav = navigator as Nav;
    if (nav.connection?.saveData || (nav.deviceMemory && nav.deviceMemory < 2)) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setShader(true));
    return () => cancel(handle as number);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const seam = panel.current?.querySelector<SVGPathElement>("[data-seam]");
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-panel-mark]", { autoAlpha: 0, scale: 0.85, rotate: -8, duration: 0.9 })
          .from("[data-panel-line]", { autoAlpha: 0, y: 26, duration: 0.8, stagger: 0.12 }, "-=0.5");
        if (seam) {
          const length = seam.getTotalLength();
          gsap.set(seam, { strokeDasharray: `10 8`, strokeDashoffset: 0 });
          tl.fromTo(seam, { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: 1.2, ease: "power2.inOut" }, "-=0.6");
          // the running stitch keeps travelling, slowly, like thread pulled through cloth
          gsap.to(seam, { strokeDashoffset: -length, duration: length / 18, ease: "none", repeat: -1 });
        }
      });
      return () => mm.revert();
    },
    { scope: panel },
  );

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main id="main" className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:py-16 xl:px-20">
        <div className="mx-auto w-full max-w-[28rem]">{children}</div>
      </main>

      <aside
        ref={panel}
        aria-hidden="true"
        className="relative isolate order-first flex min-h-56 flex-col justify-end overflow-hidden bg-brand-night p-6 text-brand-sand sm:min-h-72 sm:p-10 lg:order-none lg:min-h-0 lg:p-14"
      >
        {shader && <ThreadShader />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-brand-night/85 to-transparent" />
        <div className="relative max-w-md">
          <span data-panel-mark="" className="mb-6 inline-block">
            <LogoMark className="h-14 w-auto text-brand-sand sm:h-20" />
          </span>
          <p data-panel-line="" className="font-hand text-hand leading-snug text-brand-sand">
            {line}
          </p>
          <p data-panel-line="" className="mt-3 max-w-sm text-body text-brand-sand/80 max-sm:hidden">
            طلباتك وقطعك وفلوسك، في مكان واحد على شاشة كبيرة.
          </p>
          <svg viewBox="0 0 320 24" className="mt-6 h-6 w-64 max-sm:hidden" fill="none">
            <path data-seam="" d="M2 14 C 60 2, 110 22, 170 12 S 280 4, 318 12" stroke="var(--color-brand-orange)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </aside>
    </div>
  );
}
