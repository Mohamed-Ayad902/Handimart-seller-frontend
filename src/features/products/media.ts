/**
 * Media for a product, prepared in the browser before it is sent (handover risk R1).
 *
 * The site runs on Vercel, whose functions refuse request bodies above about 4.5 MB. So
 * everything is compressed here before it goes, like the app does: photos to 1600px on the long
 * side and re-encoded, videos (up to a minute) re-encoded to H.264 at up to 720p (the app's
 * FFmpeg CRF 28 / iOS 1280x720 export) with a bitrate that fits one request. The seller can pick
 * files of any size; a save then sends the media in as many requests as it takes, each under
 * `UPLOAD_BUDGET` (see `uploadBatches`).
 */
export const MAX_MEDIA = 10;
/** The most one request may carry, with room left under Vercel's ~4.5 MB for the details part. */
export const UPLOAD_BUDGET = 4 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 60;
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
  tooBig: "الملف ده أكبر من ٤ ميجا حتى بعد الضغط. اختار ملف أصغر.",
  none: "ضيف صورة واحدة على الأقل للقطعة.",
  broken: "معرفناش نقرا الصورة دي. جرّب صورة تانية.",
  videoBroken: "معرفناش نقرا الفيديو ده. جرّب فيديو تاني.",
  videoLong: "الفيديو لازم يكون دقيقة (٦٠ ثانية) أو أقل. قصّره واختاره تاني.",
  videoNoEncoder: "المتصفح ده مبيعرفش يضغط الفيديو، والفيديو أكبر من ٤ ميجا. جرّب من Chrome أو Edge أو اختار فيديو أصغر.",
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

const VIDEO_LONG_SIDE = 1280;
const VIDEO_MAX_BPS = 2_500_000;
const AUDIO_BPS = 96_000;

/**
 * Checks a video is at most `VIDEO_MAX_SECONDS` long (throws `MEDIA_MSG.videoLong`), then
 * re-encodes it in the browser (WebCodecs, through mediabunny) to H.264/AAC MP4, at most 1280px
 * on the long side, with a bitrate chosen so the result fits one request. Browsers without
 * WebCodecs get the original back when it already fits, else `MEDIA_MSG.videoNoEncoder`.
 */
export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(MEDIA_MSG.videoBroken);
    const seconds = await input.computeDuration();
    if (seconds > VIDEO_MAX_SECONDS + 0.5) throw new Error(MEDIA_MSG.videoLong);
    if (typeof VideoEncoder === "undefined") {
      if (file.size <= UPLOAD_BUDGET) return file;
      throw new Error(MEDIA_MSG.videoNoEncoder);
    }
    // 12% for the container and encoder overshoot, the rest split between picture and sound. A minute still gets ~400 kbps.
    const bps = Math.min(VIDEO_MAX_BPS, Math.floor((UPLOAD_BUDGET * 8 * 0.88) / Math.max(1, seconds)) - AUDIO_BPS);
    const landscape = track.displayWidth >= track.displayHeight;
    const shrink = Math.max(track.displayWidth, track.displayHeight) > VIDEO_LONG_SIDE;
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: { codec: "avc", quality: new mb.Quality({ bitrate: bps }), ...(shrink ? (landscape ? { width: VIDEO_LONG_SIDE } : { height: VIDEO_LONG_SIDE }) : {}) },
      audio: { codec: "aac", quality: new mb.Quality({ bitrate: AUDIO_BPS }) },
      showWarnings: false,
    });
    if (!conversion.isValid) {
      if (file.size <= UPLOAD_BUDGET) return file;
      throw new Error(MEDIA_MSG.videoNoEncoder);
    }
    if (onProgress) conversion.onProgress = (p) => onProgress(p);
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([buffer], `${base}.mp4`, { type: "video/mp4", lastModified: Date.now() });
  } finally {
    input.dispose();
  }
}

/** Splits files, in order, into groups that each fit one request. A file is never larger than the budget (the picker checks). */
export function uploadBatches(files: File[]): File[][] {
  const batches: File[][] = [];
  let size = 0;
  for (const file of files) {
    const last = batches[batches.length - 1];
    if (last && size + file.size <= UPLOAD_BUDGET) {
      last.push(file);
      size += file.size;
    } else {
      batches.push([file]);
      size = file.size;
    }
  }
  return batches;
}

export function totalBytes(items: { file: File }[]): number {
  return items.reduce((sum, m) => sum + m.file.size, 0);
}

export function formatMB(bytes: number): string {
  if (bytes < 100 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ar-EG")} كيلو`;
  return `${(bytes / (1024 * 1024)).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} ميجا`;
}
