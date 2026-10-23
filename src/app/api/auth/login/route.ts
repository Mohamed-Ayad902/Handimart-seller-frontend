import type { NextRequest } from "next/server";
import { authRoute } from "@/server/authenticate";
import { fail, MSG, PHONE } from "@/server/respond";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; password?: unknown } | null;
  if (typeof body?.phone !== "string" || !PHONE.test(body.phone) || typeof body.password !== "string" || !body.password || body.password.length > 128) {
    return fail(400, MSG.badInput);
  }
  return authRoute(request, { backendPath: "/auth/seller/login", purpose: "login", limit: 15, body: { phone: body.phone, password: body.password }, sessionFromReply: true, unauthorizedMessage: MSG.badLogin });
}
