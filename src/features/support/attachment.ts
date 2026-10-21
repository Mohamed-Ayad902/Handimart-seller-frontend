import { UPLOAD_BUDGET, compressImage, formatMB } from "@/features/products/media";

/** One file per message, a photo or a PDF (the backend sniffs both from the bytes and checks again). */
export const ATTACH_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const TEXT_MAX = 2000;
export const SUBJECT_MAX = 255;

/** Photos are shrunk like product photos; a PDF has to fit one upload as it is (handover R1). */
export async function prepareAttachment(file: File): Promise<{ file: File } | { error: string }> {
  if (file.type === "application/pdf") {
    return file.size > UPLOAD_BUDGET ? { error: `الملف أكبر من ${formatMB(UPLOAD_BUDGET)}.` } : { file };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "ابعت صورة (JPG أو PNG أو WebP) أو ملف PDF." };
  try {
    const shrunk = await compressImage(file);
    return shrunk.size > UPLOAD_BUDGET ? { error: `الصورة أكبر من ${formatMB(UPLOAD_BUDGET)}.` } : { file: shrunk };
  } catch {
    return { error: "معرفناش نقرا الصورة دي. جرّب صورة تانية." };
  }
}

export const STATUS_LABEL: Record<string, { label: string; tone: "success" | "neutral" | "progress" }> = {
  OPEN: { label: "مفتوحة", tone: "progress" },
  RESOLVED: { label: "اتحلت", tone: "success" },
  CLOSED: { label: "مقفولة", tone: "neutral" },
};

export const CONTEXT_LABEL: Record<string, string> = {
  BOOST_PAYMENT: "دفع ترويج",
  PAYOUT_ISSUE: "مشكلة في سحب",
  ORDER: "طلب",
  RETURN: "مرتجع",
};
