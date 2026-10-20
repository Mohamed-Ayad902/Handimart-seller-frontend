import { NextResponse, type NextRequest } from "next/server";
import { callBackend } from "@/server/backend";
import { isSameOrigin } from "@/server/guard";
import { clearSession, readSession } from "@/server/session";
import { fail, MSG } from "@/server/respond";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail(403, MSG.badOrigin);
  const { access, refresh } = await readSession();
  if (access) {
    await callBackend({ method: "POST", path: "/auth/logout", token: access, payload: JSON.stringify({ refreshToken: refresh }), contentType: "application/json" });
  }
  const response = NextResponse.json({ success: true, message: null, data: null });
  clearSession(response);
  return response;
}
