import type { StatusTone } from "@/components/ui/StatusTag";
import type { Product, ProductRejectionReason, ProductType, ShippingFlag } from "@/lib/types";

/** Wording from the seller app's own strings, so both say the same thing. */
export const TYPE: Record<ProductType, { label: string; body: string }> = {
  READY_MADE: { label: "جاهزة", body: "عندك منها دلوقتي، وبتبيع من الكمية المتاحة." },
  MADE_TO_ORDER: { label: "بتتعمل بالطلب", body: "بتبدأ تعملها لما العميل يطلب، فبتحدد وقت التجهيز." },
};

export const FLAG: Record<ShippingFlag, { label: string; tone: StatusTone }> = {
  FRAGILE: { label: "قابل للكسر", tone: "danger" },
  GLASS_ITEM: { label: "إزاز", tone: "danger" },
  SPECIAL_HANDLING: { label: "وزنه تقيل", tone: "warning" },
  REQUIRES_SIGNATURE: { label: "استلام بالتوقيع", tone: "info" },
  ASSEMBLY_REQUIRED: { label: "محتاج تركيب", tone: "info" },
};

export const REJECTION: Record<ProductRejectionReason, string> = {
  INAPPROPRIATE_CONTENT: "محتوى المنتج (الاسم أو الوصف) مخالف لسياسات المنصة.",
  POOR_IMAGE_QUALITY: "صور المنتج مش واضحة كفاية، يا ريت ترفع صور أوضح.",
  INCORRECT_CATEGORY: "القسم اللي اخترته مش مناسب لنوع المنتج ده.",
  PRICING_ERROR: "فيه مشكلة في السعر المدخل، يا ريت تراجعه تاني.",
  COUNTERFEIT_ITEM: "المنتج ده مينفعش يتباع لأنه تقليد لمنتج ماركة تانية.",
  OTHER: "عفواً، تم رفض المنتج. راجع تعليق الإدارة تحت عشان تعرف التفاصيل.",
};

/** The one status a seller needs to read on a card: review first, then whether customers can see it. */
export function productState(p: Product): { label: string; tone: StatusTone } {
  if (p.approvalStatus === "REJECTED") return { label: "رجعتلك بملاحظات", tone: "danger" };
  if (p.approvalStatus === "PENDING") return { label: "بتتراجع", tone: "progress" };
  if (!p.active) return { label: "متوقف", tone: "neutral" };
  if (p.availability === "OUT_OF_STOCK") return { label: "خلص", tone: "warning" };
  return { label: "معروض", tone: "success" };
}

export const TABS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "معروض" },
  { key: "review", label: "بتتراجع" },
  { key: "inactive", label: "متوقف" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export function inTab(p: Product, tab: TabKey): boolean {
  switch (tab) {
    case "all":
      return true;
    case "active":
      return p.active && p.approvalStatus === "APPROVED";
    case "review":
      return p.approvalStatus !== "APPROVED";
    case "inactive":
      return !p.active && p.approvalStatus === "APPROVED";
  }
}

export function cover(p: Product): string | null {
  return p.media.find((m) => m.type === "IMAGE" && m.url)?.url ?? null;
}
