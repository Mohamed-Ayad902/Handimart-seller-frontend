import { apiUrl, appEnv, imageHosts } from "./env";

/**
 * Upload folders the backend itself treats as public (`S3FileStorageService.PUBLIC_KEY_PREFIXES`),
 * mirrored in `next.config.ts`. Private files (ID documents, support attachments) come as short
 * presigned URLs instead and pass only when their host is listed in `HANDIMART_IMAGE_HOSTS`.
 */
export const PUBLIC_MEDIA_FOLDERS = ["products", "categories", "banners", "campaigns", "stores", "profile_pics", "reviews/photos"];
const PUBLIC_MEDIA = new RegExp(`^/files/(${PUBLIC_MEDIA_FOLDERS.join("|")})/`);

const apiHost = new URL(apiUrl).hostname;

/** localhost and private-network addresses: where a developer's own backend lives. */
function isLocalNetwork(host: string) {
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/**
 * Turns whatever the API sends for a photo into something the site can show, or null.
 *
 * - `/files/...` paths and absolute URLs on the backend itself are served through this site's own
 *   `/files` rewrite, so the browser never needs the backend's address.
 * - Other absolute URLs (a CDN, the sample-data photos) are kept only for hosts listed in
 *   `HANDIMART_IMAGE_HOSTS`. Anything else gives null, which renders the designed "no photo" state
 *   instead of crashing the page.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return PUBLIC_MEDIA.test(url) ? url : null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.toLowerCase();
  const isBackend = host === apiHost || (appEnv !== "production" && isLocalNetwork(host));
  if (isBackend) return PUBLIC_MEDIA.test(parsed.pathname) ? parsed.pathname : null;

  return parsed.protocol === "https:" && imageHosts.includes(host) ? parsed.href : null;
}
