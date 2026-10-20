import "server-only";
import type { NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";

/**
 * Same-origin check for anything that changes data. Cookies are SameSite=Lax already; this also
 * refuses requests whose Origin is another site, so a malicious page can never act as the visitor.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const o = new URL(origin);
    return o.host === host || o.origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Fixed-window limiter keyed by caller and purpose, for sign-in style endpoints. */
export function limited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
