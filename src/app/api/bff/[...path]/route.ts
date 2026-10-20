import type { NextRequest } from "next/server";
import { proxy } from "@/server/proxy";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, `/${path.join("/")}`);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
