import "server-only";
import { apiUrl } from "@/lib/env";

/**
 * Server-to-backend calls made on behalf of a signed-in visitor. Only the session layer and the
 * proxy route use this; pages that show public data use `lib/api/http.ts` instead.
 */
const CLIENT_KEY = process.env.HANDIMART_API_CLIENT_KEY;
const TIMEOUT_MS = 15_000;

export interface BackendReply {
  status: number;
  /** Parsed JSON body, or null when the backend sent none. */
  body: unknown;
}

export interface BackendCall {
  method: string;
  path: string;
  query?: string;
  token?: string | null;
  /** Raw request body; `contentType` says how to send it. */
  payload?: BodyInit | null;
  contentType?: string | null;
  clientIp?: string;
}

export async function callBackend({ method, path, query, token, payload, contentType, clientIp }: BackendCall): Promise<BackendReply> {
  const url = `${apiUrl}${path}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": "ar" };
  if (CLIENT_KEY) headers["X-Handimart-Client-Key"] = CLIENT_KEY;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (contentType && payload) headers["Content-Type"] = contentType;
  if (clientIp) headers["X-Forwarded-For"] = clientIp;
  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: payload ?? undefined, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { status: 503, body: { success: false, message: "السيرفر مش بيرد دلوقتي. جرّب تاني بعد شوية.", data: null } };
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { status: response.status, body };
}
