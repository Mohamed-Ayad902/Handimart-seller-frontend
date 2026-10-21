import type { RejectionReason } from "@/lib/types";

/** The team's rejection reasons in the app's words (`RejectionReasonLabels`). */
export const REASONS: Record<RejectionReason, string> = {
  INCOMPLETE_PERSONAL_INFO: "بياناتك الشخصية مش كاملة، يا ريت تكملها عشان نقدر نقبل طلبك.",
  INVALID_DOCUMENTS: "الصور والمستندات اللي رفعتها مش واضحة، يا ريت تصورها وترفعها تاني بوضوح.",
  FRAUDULENT_ACTIVITY: "علقنا الحساب مؤقتاً عشان لاحظنا نشاط غريب أو مخالف لنظام المنصة.",
  STORE_POLICY_VIOLATION: "عفواً، المتجر بيخالف بعض الشروط والسياسات الخاصة بينا.",
  LOW_QUALITY_STORE_ASSETS: "جودة صور المتجر (اللوجو أو الكفر) ضعيفة شوية، يا ريت تغيرها لصور أوضح عشان تليق بمتجرك.",
  OTHER: "عفواً، تم رفض طلبك. تقدر تراجع تعليق الإدارة تحت عشان تعرف التفاصيل.",
};
