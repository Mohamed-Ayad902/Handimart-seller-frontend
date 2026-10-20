import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { appEnv, siteUrl } from "@/lib/env";
import { callBackend } from "./backend";

/**
 * The sign-in session. The browser never holds a token it can read: the access and refresh
 * tokens live in httpOnly cookies that only this server reads, and every call to the backend on
 * the seller's behalf goes through the proxy route. `hms_in` is a harmless "someone is signed in"
 * flag for the interface. Names differ from the customer site's so the two sites never read each
 * other's cookies if they ever share a parent domain.
 */
export const ACCESS_COOKIE = "hms_at";
export const REFRESH_COOKIE = "hms_rt";
export const HINT_COOKIE = "hms_in";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const secure = siteUrl.startsWith("https://") || appEnv === "production";

export interface Tokens {
  token: string;
  refreshToken: string;
}

function jwtExpiresIn(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    if (payload.exp) return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    // fall through to a short default
  }
  return 60 * 60;
}

const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

export function writeSession(response: NextResponse, tokens: Tokens) {
  response.cookies.set(ACCESS_COOKIE, tokens.token, { ...base, maxAge: jwtExpiresIn(tokens.token) });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
  response.cookies.set(HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: REFRESH_MAX_AGE });
}

export function clearSession(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) response.cookies.set(name, "", { ...base, maxAge: 0 });
  response.cookies.set(HINT_COOKIE, "", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function readSession(): Promise<{ access: string | null; refresh: string | null }> {
  const jar = await cookies();
  return { access: jar.get(ACCESS_COOKIE)?.value ?? null, refresh: jar.get(REFRESH_COOKIE)?.value ?? null };
}

/**
 * Refresh tokens rotate, so two requests that notice an expired access token at the same moment
 * must share one refresh: the second would otherwise present an already-used token and sign the
 * visitor out. Results are kept for a few seconds for the same reason.
 */
const inflight = new Map<string, Promise<Tokens | null>>();
const recent = new Map<string, { tokens: Tokens | null; at: number }>();

export async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  const now = Date.now();
  for (const [key, entry] of recent) if (now - entry.at > 20_000) recent.delete(key);
  const cached = recent.get(refreshToken);
  if (cached) return cached.tokens;
  const running = inflight.get(refreshToken);
  if (running) return running;
  const job = (async () => {
    const reply = await callBackend({
      method: "POST",
      path: "/auth/refresh",
      payload: JSON.stringify({ refreshToken }),
      contentType: "application/json",
    });
    const data = (reply.body as { data?: Partial<Tokens> } | null)?.data;
    const tokens = reply.status === 200 && data?.token && data.refreshToken ? { token: data.token, refreshToken: data.refreshToken } : null;
    // a network failure (503) must not be remembered as "the token is dead"
    if (reply.status !== 503) recent.set(refreshToken, { tokens, at: Date.now() });
    return tokens;
  })().finally(() => inflight.delete(refreshToken));
  inflight.set(refreshToken, job);
  return job;
}
