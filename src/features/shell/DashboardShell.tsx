"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { homeFor, useSeller } from "@/features/auth/session";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

/**
 * The signed-in frame. It waits for `auth/seller/me` and sends anyone who isn't an active
 * seller to the right place (sign-in or account status). This only shapes the interface: the
 * backend enforces the SELLER role and ownership on every call regardless.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: seller, isPending, isError, refetch } = useSeller();

  useEffect(() => {
    if (isPending || isError) return;
    if (!seller) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (homeFor(seller) !== "/") router.replace(homeFor(seller));
  }, [seller, isPending, isError, router, pathname]);

  if (isError) {
    return (
      <main id="main" className="grid min-h-dvh place-items-center p-6 text-center" role="alert">
        <div>
          <p className="text-title font-extrabold">معرفناش نوصل لحسابك دلوقتي</p>
          <p className="mt-2 text-body text-ink-2">راجع النت وجرّب تاني.</p>
          <Button className="mt-5" onClick={() => refetch()}>
            حاول مرة أخرى
          </Button>
        </div>
      </main>
    );
  }

  if (!seller || seller.accountStatus !== "ACTIVE") {
    return (
      <div className="min-h-dvh md:grid md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]" aria-busy="true" aria-label="بنجهّز ورشتك">
        <div className="hidden border-e border-divider bg-surface p-4 md:block">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
        <div className="page-gutter py-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-(--z-dialog) rounded-control bg-inverse px-4 py-2 text-on-inverse focus:not-sr-only focus:fixed focus:top-3 focus:start-3">
        اتنقل للمحتوى
      </a>
      <Sidebar seller={seller} />
      <div className="min-w-0">
        <TopBar seller={seller} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[84rem] page-gutter pt-6 pb-28 outline-none md:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
