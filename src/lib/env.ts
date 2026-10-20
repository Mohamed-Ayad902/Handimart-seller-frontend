/**
 * One place that decides which environment the site runs in and how it reaches the backend.
 * It has no server-only imports on purpose: `next.config.ts` reads it too.
 *
 *   development  next dev, a backend on this machine
 *   demo         an optimised build shown to people, a demo backend
 *   production   the real seller site, strict about its configuration
 */
export type AppEnv = "development" | "demo" | "production";

const APP_ENVS: readonly AppEnv[] = ["development", "demo", "production"];

function resolveAppEnv(): AppEnv {
  const value = process.env.APP_ENV?.trim().toLowerCase();
  if (value) {
    if ((APP_ENVS as readonly string[]).includes(value)) return value as AppEnv;
    throw new Error(`APP_ENV must be one of ${APP_ENVS.join(", ")} (got "${value}")`);
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export const appEnv: AppEnv = resolveAppEnv();

/** A signed-in tool: no environment is ever indexed (handover §7.1). */
export const isIndexable = false;

export const apiUrl = (process.env.HANDIMART_API_URL?.trim() || "http://localhost:8080/api/v1").replace(/\/$/, "");
export const apiOrigin = new URL(apiUrl).origin;

/** On Vercel, an unset NEXT_PUBLIC_SITE_URL falls back to the branch's stable address (git-<branch>). */
const vercelHost = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (vercelHost ? `https://${vercelHost}` : "http://localhost:3001")
).replace(/\/$/, "");

/**
 * Hosts the backend may point images at. The backend's sample data (dev profile) uses Pinterest
 * photos, so outside production that host is accepted without extra setup.
 */
const SAMPLE_DATA_HOSTS = ["i.pinimg.com"];

export const imageHosts: string[] = [
  ...new Set([
    ...(process.env.HANDIMART_IMAGE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
    ...(appEnv === "production" ? [] : SAMPLE_DATA_HOSTS),
  ]),
];

/** Settings the public site cannot run without. Called from `next.config.ts` so a bad deploy fails at build. */
export function assertProductionConfig() {
  if (process.env.APP_ENV?.trim().toLowerCase() !== "production") return;
  const problems: string[] = [];
  if (!process.env.HANDIMART_API_URL) problems.push("HANDIMART_API_URL is not set");
  else if (!apiUrl.startsWith("https://")) problems.push("HANDIMART_API_URL must be https");
  if (!process.env.NEXT_PUBLIC_SITE_URL) problems.push("NEXT_PUBLIC_SITE_URL is not set");
  else if (!siteUrl.startsWith("https://")) problems.push("NEXT_PUBLIC_SITE_URL must be https");
  if (problems.length) throw new Error(`Production configuration is incomplete:\n - ${problems.join("\n - ")}`);
}
