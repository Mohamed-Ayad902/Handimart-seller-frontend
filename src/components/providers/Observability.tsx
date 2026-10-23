"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { E, identifyAnalytics, setAnalyticsProperty, track } from "@/lib/observability/analytics";
import { crash, screenOf } from "@/lib/observability/crash";
import { onForegroundPush, syncPush } from "@/lib/observability/push";
import { useSeller } from "@/features/auth/session";

/**
 * Wires the site to Firebase the way the app's `SellerSession` does: every report says who
 * (the seller's opaque id) and where (the screen), uncaught errors become crash reports, and a
 * signed-in seller's browser keeps its push registration current.
 */
export function Observability() {
  const pathname = usePathname();
  const client = useQueryClient();
  const toast = useToast();
  const { data: seller } = useSeller();
  const sellerId = seller?.user?.id ?? null;
  const status = seller?.accountStatus ?? null;

  useEffect(() => {
    const onError = (e: ErrorEvent) => crash.recordNonFatal(e.error ?? e.message, true);
    const onRejection = (e: PromiseRejectionEvent) => crash.recordNonFatal(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    const screen = screenOf(pathname);
    crash.setKey("screen", screen);
    track(E.SCREEN_VIEW, { firebase_screen: screen, firebase_screen_class: screen });
    // A tap on a browser push lands here with ?from=push (public/push-sw.js).
    const url = new URL(window.location.href);
    if (url.searchParams.get("from") === "push") {
      track(E.NOTIFICATION_OPENED, { source: "push" });
      url.searchParams.delete("from");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [pathname]);

  useEffect(() => {
    identifyAnalytics(sellerId);
    crash.setUserId(sellerId);
    setAnalyticsProperty("account_status", status);
  }, [sellerId, status]);

  useEffect(() => {
    if (!sellerId || status !== "ACTIVE") return;
    syncPush();
    let stop = () => {};
    let gone = false;
    void onForegroundPush((title, body) => {
      // Something happened (a new order, a message): refresh the counts and say so.
      void client.invalidateQueries({ queryKey: ["notifications"] });
      for (const key of ["home", "orders", "custom-requests"]) void client.invalidateQueries({ queryKey: [key] });
      toast.show(body ? `${title}: ${body}` : title, { action: { label: "افتح", href: "/notifications" } });
    }).then((s) => (gone ? s() : (stop = s)));
    return () => {
      gone = true;
      stop();
    };
  }, [sellerId, status, client, toast]);

  return null;
}
