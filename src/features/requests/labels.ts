import type { StatusTone } from "@/components/ui/StatusTag";
import type { CustomRequest } from "@/lib/types";

/** Limits the server enforces too (Core `CustomRequestLimits`), mirrored to validate before a round trip. */
export const LIMITS = { TEXT_MIN: 2, TEXT_MAX: 500, MAX_REPLY_PHOTOS: 3, MIN_PRICE: 1, MAX_PRICE: 1_000_000, MAX_DAYS: 365 } as const;
const DAY = 24 * 60;

/** Wording and tone per status (app `CustomRequestLabels`): orange only where the maker has the next move. */
export const REQUEST_STATUS: Record<string, { label: string; tone: StatusTone; deadline: string | null }> = {
  OPEN: { label: "جديد", tone: "action", deadline: "ردّ قبل" },
  UNDER_REVIEW: { label: "بتراجعه", tone: "action", deadline: "ردّ قبل" },
  NEEDS_INFO: { label: "مستني رد العميل", tone: "progress", deadline: "العميل يرد قبل" },
  OFFER_SENT: { label: "العرض عند العميل", tone: "progress", deadline: "العرض ساري لحد" },
  ACCEPTED: { label: "العميل وافق", tone: "success", deadline: "العميل يكمّل الطلب قبل" },
  COMPLETED: { label: "اتطلب", tone: "success", deadline: null },
  DECLINED: { label: "اترفض", tone: "neutral", deadline: null },
  CANCELLED: { label: "اتلغى", tone: "neutral", deadline: null },
  EXPIRED: { label: "انتهت مدته", tone: "neutral", deadline: null },
};

export function requestStatus(r: CustomRequest) {
  return REQUEST_STATUS[r.status] ?? REQUEST_STATUS.OPEN!;
}

export function headline(r: CustomRequest): string {
  switch (r.status) {
    case "UNDER_REVIEW":
      return "حدّد السعر والمدة، أو اسأل العميل لو محتاج توضيح";
    case "NEEDS_INFO":
      return "سألت العميل، أول ما يرد هتقدر تبعت عرضك";
    case "OFFER_SENT":
      return "عرضك وصل للعميل، والقرار عنده";
    case "ACCEPTED":
      return "العميل وافق على عرضك، مستنيين يكمّل الطلب";
    case "COMPLETED":
      return "العميل طلب القطعة بالعرض بتاعك ✅";
    case "DECLINED":
      return r.closedBy === "SELLER" ? "اعتذرت عن الطلب ده" : "العميل رفض العرض";
    case "CANCELLED":
      return "العميل لغى الطلب";
    case "EXPIRED":
      return "الطلب انتهت مدته من غير رد";
    default:
      return "طلب جديد، العميل مستني عرضك";
  }
}

export const EVENT_LABEL: Record<string, string> = {
  CREATED: "العميل بعت الطلب",
  OPENED_BY_SELLER: "فتحت الطلب",
  INFO_REQUESTED: "سألت العميل",
  INFO_PROVIDED: "العميل رد على سؤالك",
  OFFER_SENT: "بعتّ عرض",
  OFFER_ACCEPTED: "العميل وافق على العرض",
  OFFER_DECLINED: "العميل رفض العرض",
  DECLINED_BY_SELLER: "اعتذرت عن الطلب",
  CANCELLED_BY_CUSTOMER: "العميل لغى الطلب",
  EXPIRED: "الطلب انتهت مدته",
  ORDERED: "العميل طلب القطعة",
};

/** Makers think of preparation in days; the server stores minutes. */
export const minutesToDays = (m: number) => Math.ceil(m / DAY);
export const daysToMinutes = (d: number) => d * DAY;

export function preparationLabel(minutes: number) {
  return minutes > 0 && minutes < DAY ? "أقل من يوم" : `${minutesToDays(minutes)} يوم`;
}
