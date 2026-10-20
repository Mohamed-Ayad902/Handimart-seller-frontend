import "server-only";
import { NextResponse, type NextRequest } from "next/server";

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json({ success: false, message, code: code ?? null, data: null }, { status });
}

export const MSG = {
  tooMany: "محاولات كتير في وقت قصير. استنى شوية وجرّب تاني.",
  badOrigin: "الطلب ده مش مسموح.",
  badInput: "في بيانات ناقصة أو غلط. راجعها وجرّب تاني.",
  signIn: "سجّل دخولك الأول عشان تكمل.",
  generic: "حصلت مشكلة. جرّب تاني.",
} as const;

export const PHONE = /^01[0125][0-9]{8}$/;
