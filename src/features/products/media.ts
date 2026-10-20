/**
 * Media for a product, prepared in the browser before it is sent (handover risk R1).
 *
 * The site runs on Vercel, whose functions refuse request bodies above about 4.5 MB, and every
 * save carries the details and all new media in one multipart request (the backend has no
 * separate upload step). So photos are shrunk here the way the app does it (long side 1600px,
 * re-encoded), and the whole request has to fit one budget. Videos can't be re-encoded in a
 * browser cheaply, so a video has to fit what is left.
 */
export const MAX_MEDIA = 10;
export const UPLOAD_BUDGET = 4 * 1024 * 1024;
const LONG_SIDE = 1600;
const QUALITY = 0.82;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export interface PickedMedia {
  key: string;
  file: File;
  kind: "IMAGE" | "VIDEO";
  preview: string;
}

export const MEDIA_MSG = {
  type: "الملف ده مش صورة أو فيديو بنقبله. استخدم JPG أو PNG أو WebP، أو فيديو MP4 أو MOV.",
  tooMany: `لحد ${MAX_MEDIA} صور وفيديوهات للقطعة.`,
  budget: "الملفات أكبر من اللي ينفع يترفع مرة واحدة (٤ ميجا). شيل فيديو أو قلّل الصور.",
  none: "ضيف صورة واحدة على الأقل للقطعة.",
  broken: "معرفناش نقرا الصورة دي. جرّب صورة تانية.",
} as const;

export function mediaKind(file: File): "IMAGE" | "VIDEO" | null {
  if (IMAGE_TYPES.includes(file.type)) return "IMAGE";
  if (VIDEO_TYPES.includes(file.type)) return "VIDEO";
  return null;
}

async function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Shrinks a photo to 1600px on its long side and re-encodes it (WebP, else JPEG). Never makes a file bigger. */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob = await encode(canvas, "image/webp");
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await encode(canvas, "image/jpeg");
    ext = "jpg";
  }
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}

export function totalBytes(items: { file: File }[]): number {
  return items.reduce((sum, m) => sum + m.file.size, 0);
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} ميجا`;
}
