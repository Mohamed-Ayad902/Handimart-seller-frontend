import "server-only";
import { mediaUrl } from "@/lib/media";

const SINGLE = new Set(["url", "imageUrl", "logoUrl", "bannerUrl", "mediaUrl", "profilePicUrl", "storeLogoUrl", "customerImage", "photoUrl", "avatarUrl", "attachmentUrl", "productImageUrl", "coverImageUrl"]);
const LISTS = new Set(["photoUrls", "imageUrls", "referenceImages", "referenceImageUrls", "sellerPhotoUrls"]);

/**
 * Photos in API answers are rewritten to what the site can actually show (the site's own `/files`
 * route, or an allowed image host) and dropped otherwise, so a client component can hand any
 * of them straight to the image component without ever seeing the backend's address.
 */
export function normalizeMedia<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizeMedia) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SINGLE.has(key) && (typeof v === "string" || v === null)) out[key] = mediaUrl(v as string | null);
      else if (LISTS.has(key) && Array.isArray(v)) out[key] = v.map((x) => (typeof x === "string" ? mediaUrl(x) : x)).filter(Boolean);
      else out[key] = normalizeMedia(v);
    }
    return out as T;
  }
  return value;
}
