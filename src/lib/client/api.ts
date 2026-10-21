import type { Seller } from "@/lib/types";

/**
 * The browser's only way to reach the backend for signed-in features: same-origin calls to this
 * site's proxy route. The backend's `{ success, message, data }` envelope is unwrapped here, and
 * failures come back as one `ApiError` carrying the backend's own Arabic message.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    /** Field-level messages from the backend's validation handler (`data: { field: message }`). */
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get authRequired() {
    return this.status === 401 || this.code === "AUTH_REQUIRED";
  }
}

interface Envelope<T> {
  success?: boolean;
  message?: string | null;
  code?: string | null;
  data?: T;
}

const FALLBACK = "حصلت مشكلة. جرّب تاني بعد شوية.";

function fieldErrors(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) if (typeof v === "string") out[k] = v;
  return out;
}

function failure(envelope: Envelope<unknown> | null, status: number) {
  return new ApiError(envelope?.message || FALLBACK, status, envelope?.code ?? null, fieldErrors(envelope?.data));
}

export async function send<T>(
  url: string,
  { method = "GET", body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("مفيش اتصال بالنت. راجع الشبكة وجرّب تاني.", 0, "OFFLINE");
  }
  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || envelope?.success === false) throw failure(envelope, response.status);
  return (envelope?.data ?? null) as T;
}

/**
 * Sends files plus a JSON part (the backend's multipart endpoints), via the proxy route. Files go
 * under `fileField`, or under their own part names when given as `[name, file]` pairs.
 */
export async function upload<T>(path: string, json: unknown, files: File[] | [string, File][], { fileField = "photos", method = "POST" }: { fileField?: string; method?: string } = {}): Promise<T> {
  const form = new FormData();
  form.append("body", new Blob([JSON.stringify(json)], { type: "application/json" }));
  for (const item of files) {
    if (Array.isArray(item)) form.append(item[0], item[1]);
    else form.append(fileField, item);
  }
  let response: Response;
  try {
    response = await fetch(`/api/bff${path}`, { method, body: form, credentials: "same-origin" });
  } catch {
    throw new ApiError("مفيش اتصال بالنت. راجع الشبكة وجرّب تاني.", 0, "OFFLINE");
  }
  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || envelope?.success === false) throw failure(envelope, response.status);
  return (envelope?.data ?? null) as T;
}

/** Signed-in backend endpoints, via the proxy route. */
export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined | null>, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return send<T>(`/api/bff${path}${qs ? `?${qs}` : ""}`, { signal });
  },
  post: <T>(path: string, body?: unknown) => send<T>(`/api/bff${path}`, { method: "POST", body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => send<T>(`/api/bff${path}`, { method: "PUT", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => send<T>(`/api/bff${path}`, { method: "PATCH", body: body ?? {} }),
  delete: <T>(path: string) => send<T>(`/api/bff${path}`, { method: "DELETE" }),
};

/** Sign-in routes (they set the session cookies themselves). */
export const authApi = {
  login: (input: { phone: string; password: string }) => send<Seller>("/api/auth/login", { method: "POST", body: input }),
  register: (input: { phone: string; password: string }) => send<Seller>("/api/auth/register", { method: "POST", body: input }),
  logout: () => send<null>("/api/auth/logout", { method: "POST", body: {} }),
  me: () => send<Seller | null>("/api/auth/me"),
  requestReset: (phone: string) => send<null>("/api/auth/request-reset", { method: "POST", body: { phone } }),
  resetPassword: (input: { phone: string; code: string; newPassword: string }) => send<null>("/api/auth/reset-password", { method: "POST", body: input }),
};
