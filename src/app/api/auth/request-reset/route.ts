import type { NextRequest } from "next/server";
import { authRoute } from "@/server/authenticate";
import { fail, MSG, PHONE } from "@/server/respond";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  if (typeof body?.phone !== "string" || !PHONE.test(body.phone)) return fail(400, MSG.badInput);
  return authRoute(request, { backendPath: "/auth/seller/forgot-password/request-otp", purpose: "reset-otp", limit: 5, body: { phone: body.phone }, sessionFromReply: false });
}
