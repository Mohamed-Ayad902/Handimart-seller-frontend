"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DotsThreeOutline } from "@phosphor-icons/react";
import { m } from "motion/react";
import { Dialog } from "@/components/ui/Dialog";
import { NAV, TABS, isActive } from "@/lib/nav";
import { badgeText, useBadges } from "./badges";

/** Phone tab bar (<768px) with a "more" sheet listing every section. */
export function MobileNav() {
  const pathname = usePathname();
  const badges = useBadges();
  const [more, setMore] = useState(false);

  return (
    <>
      <nav aria-label="القائمة" className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            const n = tab.badge ? badges[tab.badge] : undefined;
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={active ? "page" : undefined} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] ${active ? "font-extrabold text-ink" : "font-semibold text-ink-2"}`}>
                  {active && <m.span layoutId="tab-thread" aria-hidden="true" className="absolute inset-x-6 top-0 h-[3px] rounded-full bg-[repeating-linear-gradient(to_left,var(--hm-primary)_0_6px,transparent_6px_9px)]" />}
                  <span className="relative">
                    <Icon weight={active ? "fill" : "regular"} className="size-6" aria-hidden="true" />
                    {n ? (
                      <span className="absolute -top-1.5 -end-2.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-4.5 font-extrabold text-on-primary">
                        <span aria-hidden="true">{badgeText(n)}</span>
                        <span className="sr-only">، {n} مستني ردك</span>
                      </span>
                    ) : null}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[0.75rem] font-semibold text-ink-2">
              <DotsThreeOutline className="size-6" aria-hidden="true" />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={more} onClose={() => setMore(false)} title="كل الأقسام">
        <div className="flex flex-col gap-4">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.title && <p className="mb-1 text-meta font-bold text-ink-3">{group.title}</p>}
              <ul className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const cls = "flex min-h-12 items-center gap-2.5 rounded-control border px-3 text-body-sm";
                  return (
                    <li key={item.href}>
                      {item.soon ? (
                        <span aria-disabled="true" className={`${cls} border-divider text-ink-3`}>
                          <Icon className="size-5" aria-hidden="true" />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-[0.6875rem] font-bold">قريباً</span>
                        </span>
                      ) : (
                        <Link href={item.href} onClick={() => setMore(false)} className={`${cls} border-line font-bold text-ink hover:border-ink`}>
                          <Icon className="size-5" aria-hidden="true" />
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
