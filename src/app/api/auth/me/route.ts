import { NextResponse, type NextRequest } from "next/server";
import { proxy } from "@/server/proxy";
import { clearSession, readSession } from "@/server/session";

export const dynamic = "force-dynamic";

/** Who is signed in. Answers 200 with `data: null` for visitors without a session. */
export async function GET(request: NextRequest) {
  const { access, refresh } = await readSession();
  const guest = () => NextResponse.json({ success: true, message: null, data: null }, { headers: { "Cache-Control": "private, no-store" } });
  if (!access && !refresh) return guest();
  const reply = await proxy(request, "/auth/seller/me");
  // 401: the session is gone. 403: signed in, but not as a seller (a customer token, for instance).
  if (reply.status === 401 || reply.status === 403) {
    const response = guest();
    for (const cookie of reply.cookies.getAll()) response.cookies.set(cookie);
    if (reply.status === 403) clearSession(response);
    return response;
  }
  return reply;
}
