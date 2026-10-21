import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { callBackend } from "./backend";
import { forcedQuery, isAllowed } from "./allowlist";
import { isSameOrigin, limited } from "./guard";
import { clearSession, readSession, refreshTokens, writeSession, type Tokens } from "./session";
import { clientIp, fail, MSG } from "./respond";
import { normalizeMedia } from "./media";

/**
 * Forwards one request to the backend on behalf of the signed-in visitor. It attaches the token
 * from the httpOnly cookie, renews it once when the backend answers 401, and only forwards endpoints on the
 * allow-list. The browser never sees a token and never talks to the backend directly.
 */
const MAX_BODY = 12 * 1024 * 1024;

export async function proxy(request: NextRequest, backendPath: string, { enforceAllowList = true } = {}) {
  const method = request.method;

  if (enforceAllowList && !isAllowed(method, backendPath)) return fail(404, "مش موجود.", "NOT_FOUND");
  if (method !== "GET" && !isSameOrigin(request)) return fail(403, MSG.badOrigin, "BAD_ORIGIN");
  const ip = clientIp(request);
  if (limited(`bff:${ip}`, 300, 60_000)) return fail(429, MSG.tooMany, "RATE_LIMITED");

  const { access, refresh } = await readSession();
  let token = access;
  let rotated: Tokens | null = null;
  if (!token && refresh) {
    rotated = await refreshTokens(refresh);
    token = rotated?.token ?? null;
  }
  if (!token) {
    const response = fail(401, MSG.signIn, "AUTH_REQUIRED");
    if (refresh) clearSession(response);
    return response;
  }

  let payload: ArrayBuffer | null = null;
  if (method !== "GET") {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BODY) return fail(413, "الملف كبير أوي.", "TOO_LARGE");
    payload = await request.arrayBuffer();
    if (payload.byteLength > MAX_BODY) return fail(413, "الملف كبير أوي.", "TOO_LARGE");
    if (payload.byteLength === 0) payload = null;
  }

  const params = new URLSearchParams(request.nextUrl.searchParams);
  for (const [k, v] of Object.entries(forcedQuery(backendPath) ?? {})) params.set(k, v);

  const call = (bearer: string) =>
    callBackend({
      method,
      path: backendPath,
      query: params.toString(),
      token: bearer,
      payload,
      contentType: request.headers.get("content-type"),
      clientIp: ip,
    });

  let reply = await call(token);
  let signedOut = false;
  // Only 401 means "token expired". 403 means "not allowed" and a refresh would not change that.
  if (reply.status === 401 && refresh && !rotated) {
    rotated = await refreshTokens(refresh);
    if (rotated) reply = await call(rotated.token);
    else signedOut = true;
  } else if (reply.status === 401) {
    signedOut = true;
  }

  const response = NextResponse.json(reply.body ? normalizeMedia(reply.body) : { success: reply.status < 400, message: null, data: null }, {
    status: reply.status,
    headers: { "Cache-Control": "private, no-store" },
  });
  if (signedOut) clearSession(response);
  else if (rotated) writeSession(response, rotated);
  return response;
}

