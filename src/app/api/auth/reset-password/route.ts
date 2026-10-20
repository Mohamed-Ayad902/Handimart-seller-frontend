import type { NextRequest } from "next/server";
import { authRoute } from "@/server/authenticate";
import { fail, MSG, PHONE } from "@/server/respond";

export const dynamic = "force-dynamic";

/** Mirrors the backend's ResetPasswordRequest: 6-digit code, password of at least 8 characters. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown; newPassword?: unknown } | null;
  const valid =
    typeof body?.phone === "string" &&
    PHONE.test(body.phone) &&
    typeof body.code === "string" &&
    /^[0-9]{6}$/.test(body.code) &&
    typeof body.newPassword === "string" &&
    body.newPassword.length >= 8 &&
    body.newPassword.length <= 128;
  if (!valid) return fail(400, MSG.badInput);
  return authRoute(request, {
    backendPath: "/auth/seller/forgot-password/reset-password",
    purpose: "reset",
    limit: 10,
    body: { phone: body.phone, code: body.code, newPassword: body.newPassword },
    sessionFromReply: false,
  });
}
