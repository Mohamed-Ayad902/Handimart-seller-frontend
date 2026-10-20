"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { LogoMark } from "@/components/brand/LogoMark";
import { NAV, isActive, type NavItem } from "@/lib/nav";
import type { Seller } from "@/lib/types";
import { StoreMark } from "./StoreMark";
import { badgeText, useBadges } from "./badges";

/**
 * Desktop sidebar (≥1024px) and tablet icon rail (768-1023px), on the right in RTL. The active
 * entry is marked by an orange running stitch that slides to it when you navigate.
 */
export function Sidebar({ seller }: { seller: Seller }) {
  const pathname = usePathname();
  const badges = useBadges();
  const store = seller.store;

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-e border-divider bg-surface md:flex" aria-label="القائمة الرئيسية">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 lg:px-5">
        <StoreMark store={store} size={40} />
        <div className="min-w-0 max-lg:sr-only">
          <p className="truncate text-subtitle font-extrabold">{store?.name ?? "متجري"}</p>
          {store?.vacationMode ? (
            <p className="text-meta font-bold text-warning">في إجازة دلوقتي</p>
          ) : (
            <p className="text-meta text-ink-3">متجرك شغّال</p>
          )}
        </div>
      </div>
      <div className="stitch mx-4 w-auto opacity-70" aria-hidden="true" />

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        {NAV.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.title && <p className="mb-1 px-3 text-meta font-bold text-ink-3 max-lg:hidden">{group.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Entry item={item} active={isActive(pathname, item.href)} badge={item.badge ? badges[item.badge] : undefined} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 px-5 py-4 text-ink-3 max-lg:justify-center">
        <LogoMark className="h-6 w-auto text-ink-3" />
        <span className="text-meta font-bold max-lg:sr-only">هانديمارت للبائعين</span>
      </div>
    </aside>
  );
}

function Entry({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  const base = "group relative flex min-h-11 items-center gap-3 rounded-control px-3 text-body-sm max-lg:justify-center";

  if (item.soon) {
    return (
      <span aria-disabled="true" className={`${base} cursor-default text-ink-3`} title={`${item.label} (قريباً)`}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 max-lg:sr-only">{item.label}</span>
        <span className="rounded-tag bg-surface-sunken px-1.5 text-[0.6875rem] font-bold text-ink-3 max-lg:hidden">قريباً</span>
        <span className="sr-only lg:hidden">قريباً</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`${base} transition-colors duration-quick ${active ? "bg-paper font-extrabold text-ink" : "font-semibold text-ink-2 hover:bg-paper/70 hover:text-ink"}`}
    >
      {active && (
        <m.span
          layoutId="nav-thread"
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[repeating-linear-gradient(to_bottom,var(--hm-primary)_0_6px,transparent_6px_9px)]"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <Icon weight={active ? "fill" : "regular"} className="size-5 shrink-0 transition-transform duration-standard ease-soft group-hover:-translate-x-0.5" aria-hidden="true" />
      <span className="flex-1 max-lg:sr-only">{item.label}</span>
      {badge ? (
        <span className="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 text-meta font-extrabold text-on-primary max-lg:absolute max-lg:-top-0.5 max-lg:end-1 max-lg:min-w-5 max-lg:text-[0.625rem]">
          <span aria-hidden="true">{badgeText(badge)}</span>
          <span className="sr-only">، {badge} مستني ردك</span>
        </span>
      ) : null}
    </Link>
  );
}
