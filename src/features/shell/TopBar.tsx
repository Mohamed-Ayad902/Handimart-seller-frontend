"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Bell, MagnifyingGlass, SignOut } from "@phosphor-icons/react";
import { LogoMark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { Seller } from "@/lib/types";
import { useLogout } from "@/features/auth/session";
import { StoreMark } from "./StoreMark";
import { badgeText, useUnreadCount } from "./badges";

/** Top bar: orders search, notifications, theme, and the account menu. */
export function TopBar({ seller }: { seller: Seller }) {
  return (
    <header className="sticky top-0 z-(--z-header) flex h-16 items-center gap-3 border-b border-divider bg-paper page-gutter">
      <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="الرئيسية">
        <LogoMark className="h-8 w-auto text-secondary" />
      </Link>
      <OrderSearch />
      <div className="ms-auto flex items-center gap-1">
        <BellLink />
        <ThemeToggle />
        <AccountMenu seller={seller} />
      </div>
    </header>
  );
}

/** Searches orders by customer name, phone or transaction id (what the backend matches). */
function OrderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-sm md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim().slice(0, 80);
        router.push(term ? `/orders?search=${encodeURIComponent(term)}` : "/orders");
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        دوّر في الطلبات
      </label>
      <MagnifyingGlass className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
      <input
        id="global-search"
        type="search"
        value={q}
        maxLength={80}
        onChange={(e) => setQ(e.target.value)}
        placeholder="دوّر في الطلبات باسم العميل أو موبايله"
        className="h-11 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-body-sm placeholder:text-ink-3 focus:border-ink"
      />
    </form>
  );
}

function BellLink() {
  const { data: unread } = useUnreadCount();
  const n = unread ?? 0;
  return (
    <span className="relative grid size-11 place-items-center rounded-full text-ink" title="الإشعارات (قريباً على الويب)">
      <Bell className="size-6" weight={n ? "fill" : "regular"} aria-hidden="true" />
      <span className="sr-only">{n ? `عندك ${n} إشعار جديد` : "مفيش إشعارات جديدة"}</span>
      {n > 0 && (
        <span aria-hidden="true" className="absolute top-1.5 end-1.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-4.5 font-extrabold text-on-primary">
          {badgeText(n)}
        </span>
      )}
    </span>
  );
}

function AccountMenu({ seller }: { seller: Seller }) {
  const [open, setOpen] = useState(false);
  const logout = useLogout();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = seller.user?.displayName || seller.store?.name || "حسابي";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`حسابك: ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full transition-transform duration-quick hover:scale-105 active:scale-95"
      >
        <StoreMark store={seller.store} size={34} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute end-0 top-full z-(--z-overlay) mt-2 w-64 origin-top-left rounded-image border border-line bg-surface-raised p-2 shadow-[0_18px_40px_-20px_rgb(42_19_48/0.5)]"
          >
            <div className="px-3 py-2">
              <p className="truncate text-subtitle font-extrabold">{name}</p>
              <p className="text-meta text-ink-3" dir="ltr">
                {seller.user?.phone}
              </p>
            </div>
            <div className="stitch my-1 opacity-60" aria-hidden="true" />
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-body-sm font-bold text-error hover:bg-error-container"
            >
              <SignOut className="size-5" aria-hidden="true" />
              تسجيل خروج
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
