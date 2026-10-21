import type { NextRequest } from "next/server";
import { authRoute } from "@/server/authenticate";
import { fail, MSG, PHONE } from "@/server/respond";

export const dynamic = "force-dynamic";

/**
 * Creates the draft (ONBOARDING) seller account and signs it in: the next registration steps
 * need a bearer, so the returned tokens become the session cookies here like on sign-in.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; password?: unknown } | null;
  if (typeof body?.phone !== "string" || !PHONE.test(body.phone) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
    return fail(400, MSG.badInput);
  }
  return authRoute(request, { backendPath: "/auth/seller/register", purpose: "register", limit: 10, body: { phone: body.phone, password: body.password }, sessionFromReply: true });
}
