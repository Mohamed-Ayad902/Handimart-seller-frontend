import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { callBackend } from "./backend";
import { isSameOrigin, limited } from "./guard";
import { writeSession } from "./session";
import { clientIp, fail, MSG } from "./respond";
import { normalizeMedia } from "./media";

/**
 * Shared shape of the sign-in style routes: check the request came from this site, limit how
 * often one visitor can try, forward to the backend, and on success turn the returned tokens
 * into httpOnly cookies. The seller endpoints return the tokens at the top of `SellerDto`; they
 * are stripped here, so the browser receives the profile and never a token.
 */
export async function authRoute(
  request: NextRequest,
  {
    backendPath,
    purpose,
    limit,
    body,
    sessionFromReply,
    unauthorizedMessage,
  }: { backendPath: string; purpose: string; limit: number; body: unknown; sessionFromReply: boolean; unauthorizedMessage?: string },
) {
  if (!isSameOrigin(request)) return fail(403, MSG.badOrigin, "BAD_ORIGIN");
  const ip = clientIp(request);
  if (limited(`${purpose}:${ip}`, limit, 10 * 60_000)) return fail(429, MSG.tooMany, "RATE_LIMITED");

  const reply = await callBackend({
    method: "POST",
    path: backendPath,
    payload: JSON.stringify(body),
    contentType: "application/json",
    clientIp: ip,
  });
  const envelope = reply.body as { success?: boolean; message?: string; data?: Record<string, unknown> | null } | null;

  if (reply.status >= 400 || !envelope?.success) {
    // Spring Security answers a wrong phone or password with its own English "Bad credentials".
    if (reply.status === 401 && envelope?.message === "Bad credentials" && unauthorizedMessage) return fail(401, unauthorizedMessage, "BAD_CREDENTIALS");
    return NextResponse.json(
      { success: false, message: envelope?.message ?? MSG.generic, data: envelope?.data ?? null },
      { status: reply.status >= 400 ? reply.status : 400 },
    );
  }
  if (!sessionFromReply) return NextResponse.json({ success: true, message: envelope.message ?? null, data: null });

  const { token, refreshToken, ...seller } = (envelope.data ?? {}) as { token?: string; refreshToken?: string } & Record<string, unknown>;
  if (!token || !refreshToken) return fail(502, MSG.generic);
  const response = NextResponse.json({ success: true, message: envelope.message ?? null, data: normalizeMedia(seller) });
  writeSession(response, { token, refreshToken });
  return response;
}
