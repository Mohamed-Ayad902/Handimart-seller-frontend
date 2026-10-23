"use client";

import { track, type Params } from "./analytics";

/**
 * Crash and error reporting for the web, shaped like the app's `ICrashReporter`. Crashlytics has
 * no web SDK, so reports go to Firebase Analytics as GA4 `exception` events (Firebase's own
 * answer for web), carrying the same keys the app sets: who (opaque id), where (screen / flow)
 * and the last breadcrumbs. Never personal data: messages are scrubbed of long digit runs and
 * anything shaped like an email before they leave the browser.
 */
const keys: Record<string, string | number | boolean> = { app: "seller", account_type: "seller" };
const trail: string[] = [];
const TRAIL_MAX = 20;

function scrub(text: string) {
  return text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>").replace(/\d{6,}/g, "#").replace(/\s+/g, " ").trim();
}

export const crash = {
  setUserId(id: string | null) {
    if (id) keys.user = id;
    else delete keys.user;
  },
  setKey(key: string, value: string | number | boolean) {
    keys[key] = value;
  },
  /** Breadcrumb attached to the next report: "checkout: place_order tapped", never object dumps. */
  log(message: string) {
    trail.push(scrub(message).slice(0, 80));
    if (trail.length > TRAIL_MAX) trail.shift();
  },
  /** A handled failure worth investigating (`fatal` for what broke the page). */
  recordNonFatal(error: unknown, fatal = false) {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "non-error thrown");
    const frame = err.stack?.split("\n").find((l) => /https?:\/\/|\/_next\//.test(l)) ?? "";
    const params: Params = {
      ...keys,
      description: scrub(`${err.name}: ${err.message}`),
      fatal,
      where: scrub(frame.replace(/^\s*at\s*/, "").replace(/https?:\/\/[^/]+/, "")),
      trail: trail.slice(-3).join(" > "),
    };
    if ("status" in err && typeof err.status === "number") params.status = err.status;
    if (typeof window !== "undefined") params.screen = screenOf(window.location.pathname);
    track("exception", params);
  },
};

/** A route as a stable name: ids become ":id" so reports group by screen, not by record. */
export function screenOf(pathname: string) {
  return pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").replace(/\/\d+(?=\/|$)/g, "/:n") || "/";
}
