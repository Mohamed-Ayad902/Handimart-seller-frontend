import type { StatusTone } from "@/components/ui/StatusTag";
import type { OrderStatus, PaymentMethod, PaymentStatus, SellerOrder, SellerSettableStatus } from "@/lib/types";

/** Labels and tones from the app (`OrderStatusBadge.kt`, strings.xml). Tone = whose move it is. */
export const STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: "جديد", tone: "action" },
  CONFIRMED: { label: "تم التأكيد", tone: "progress" },
  PREPARING: { label: "قيد التجهيز", tone: "progress" },
  READY_FOR_SHIPPING: { label: "جاهز للشحن", tone: "warning" },
  SHIPPED: { label: "تم الشحن", tone: "info" },
  DELIVERED: { label: "تم التسليم", tone: "success" },
  COMPLETED: { label: "مكتمل", tone: "success" },
  CANCELLED: { label: "ملغي", tone: "danger" },
  RETURNED: { label: "مسترجع", tone: "neutral" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "الدفع عند الاستلام",
  CREDIT_CARD: "بطاقة ائتمان",
  WALLET: "المحفظة",
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: "قيد الانتظار",
  PAID: "تم الدفع",
  FAILED: "فشل الدفع",
  REFUNDED: "تم الاسترجاع",
};

/**
 * Status tabs. The app groups some statuses per tab, but the backend filters by one `status`
 * only, so each web tab is one status (plus "all"): what the seller sees is exactly what the
 * server filtered and paged, never a client-side subset of a page.
 */
export const TABS: { status: OrderStatus | null; label: string; empty: { title: string; body: string } }[] = [
  { status: null, label: "الكل", empty: { title: "لسه مفيش طلبات", body: "لما العملاء يبدأوا يطلبوا من متجرك هتلاقي طلباتهم هنا." } },
  { status: "PENDING", label: "جديد", empty: { title: "مفيش طلبات مستنية ردك", body: "ردّيت على كله. أول ما يوصل طلب جديد هيظهر هنا." } },
  { status: "CONFIRMED", label: "تم التأكيد", empty: { title: "مفيش طلبات مستنية تبدأ فيها", body: "الطلبات اللي بتقبلها بتستناك هنا لحد ما تبدأ تجهيزها." } },
  { status: "PREPARING", label: "قيد التجهيز", empty: { title: "مفيش حاجة على الشغل دلوقتي", body: "الطلبات اللي بتجهزها بتستناك هنا لحد ما تخلّصها." } },
  { status: "READY_FOR_SHIPPING", label: "جاهز للشحن", empty: { title: "مفيش طلبات مستنية المندوب", body: "لما تخلّص قطعة وتعلّمها جاهزة، هتستنى المندوب هنا." } },
  { status: "SHIPPED", label: "جاري التوصيل", empty: { title: "مفيش طلبات في الطريق", body: "الطلبات اللي مع شركة الشحن بتظهر هنا لحد ما توصل." } },
  { status: "DELIVERED", label: "تم التسليم", empty: { title: "لسه مفيش طلبات وصلت", body: "كل طلب يوصل لصاحبه بيتسجل هنا." } },
  { status: "COMPLETED", label: "مكتمل", empty: { title: "لسه مفيش طلبات مكتملة", body: "بعد ما فترة الاسترجاع تخلص، الطلب بيتنقل هنا وفلوسه بتتحسب." } },
  { status: "CANCELLED", label: "ملغي", empty: { title: "مفيش طلبات ملغية", body: "أي طلب يتلغي هتلاقيه هنا." } },
  { status: "RETURNED", label: "مسترجع", empty: { title: "مفيش طلبات مرتجعة", body: "أي طلب يرجع هتلاقيه هنا." } },
];

/** The next-step ticket on the order (app strings `order_next_*`). */
export const NEXT: Record<OrderStatus, { title: string; body: string }> = {
  PENDING: { title: "طلب جديد مستني ردك", body: "اقبله عشان العميل يعرف إنك هتشتغل عليه، أو اعتذر وقوله السبب." },
  CONFIRMED: { title: "قبلته. ابدأ التجهيز", body: "أول ما تبدأ تشتغل فيه علّمه، والعميل هيوصله إشعار." },
  PREPARING: { title: "على الشغل دلوقتي", body: "لما يخلص ويتغلّف كويس، علّمه جاهز عشان المندوب ييجي ياخده." },
  READY_FOR_SHIPPING: { title: "مستني المندوب", body: "الطلب جاهز عندك، والمندوب هييجي يستلمه." },
  SHIPPED: { title: "في الطريق للعميل", body: "الطلب مع شركة الشحن دلوقتي." },
  DELIVERED: { title: "وصل لصاحبه", body: "الطلب ده خلص على خير." },
  COMPLETED: { title: "وصل لصاحبه", body: "الطلب ده خلص على خير." },
  CANCELLED: { title: "الطلب اتلغى", body: "مفيش حاجة مطلوبة منك في الطلب ده." },
  RETURNED: { title: "الطلب رجع", body: "القطعة راجعة لك. تابع مع الدعم لو محتاج حاجة." },
};

/** The order's journey as five stitches (app `order_journey_*`). */
export const JOURNEY = ["جديد", "بيتعمل", "جاهز", "مع المندوب", "وصل"] as const;
export function journeyStep(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "CONFIRMED":
    case "PREPARING":
      return 1;
    case "READY_FOR_SHIPPING":
      return 2;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
    case "COMPLETED":
      return 4;
    default:
      return -1;
  }
}

export type MoveKind = "accept" | "prepare" | "ready" | "decline" | "cancel";

export interface Move {
  kind: MoveKind;
  label: string;
  target: SellerSettableStatus;
  /** Needs a written reason (sent to the customer). */
  needsReason: boolean;
  confirm: { title: string; body: string; cta: string };
}

const MOVES: Record<MoveKind, Move> = {
  accept: {
    kind: "accept",
    label: "قبول الطلب",
    target: "CONFIRMED",
    needsReason: false,
    confirm: { title: "أكيد هتقبل الطلب؟", body: "بمجرد القبول، العميل هيعرف إنك استلمت الطلب وبدأت تشتغل عليه. بالتوفيق!", cta: "قبول الطلب" },
  },
  prepare: {
    kind: "prepare",
    label: "البدء بالتجهيز",
    target: "PREPARING",
    needsReason: false,
    confirm: { title: "هتبدأ تجهز الطلب؟", body: "العميل هيجيله إشعار إنك بدأت تشتغل في طلبه فوراً. عاش!", cta: "البدء بالتجهيز" },
  },
  ready: {
    kind: "ready",
    label: "جاهز للاستلام",
    target: "READY_FOR_SHIPPING",
    needsReason: false,
    confirm: { title: "الطلب جاهز للاستلام؟", body: "بمجرد تأكيدك، هنبعتلك مندوبنا يستلم الشحنة من بابك ويوصلها للعميل. اتأكد إن التغليف تمام!", cta: "أكد التجهيز وابعت المندوب" },
  },
  decline: {
    kind: "decline",
    label: "رفض",
    target: "CANCELLED",
    needsReason: true,
    confirm: { title: "سبب رفض الطلب", body: "يرجى توضيح سبب رفض الطلب، سيتم إرسال هذا السبب للعميل.", cta: "تأكيد الرفض" },
  },
  cancel: {
    kind: "cancel",
    label: "إلغاء الطلب",
    target: "CANCELLED",
    needsReason: false,
    confirm: { title: "متأكد إنك عايز تلغي؟", body: "القرار ده مش هينفع نرجع فيه، والعميل هيتبلغ بإلغاء الطلب.", cta: "تأكيد الإلغاء" },
  },
};

/**
 * The seller's moves for an order, exactly as the app offers them (`StickyBottomActionBar.kt`):
 * one forward step and one way out. Declining a new order needs a reason for the customer
 * (≥ 5 characters, `OrderDetailVM.confirmDecline`); cancelling later is a plain confirm.
 * The backend re-checks every transition.
 */
export function movesFor(order: SellerOrder): { forward: Move | null; back: Move | null } {
  switch (order.status) {
    case "PENDING":
      return { forward: MOVES.accept, back: MOVES.decline };
    case "CONFIRMED":
      return { forward: MOVES.prepare, back: MOVES.cancel };
    case "PREPARING":
      return { forward: MOVES.ready, back: MOVES.cancel };
    default:
      return { forward: null, back: null };
  }
}

/** Short reference shown to sellers (app `order_ref`: the id's first block). */
export function orderRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function itemsSummary(order: SellerOrder): string {
  const [first, ...rest] = order.items;
  if (!first) return "";
  return rest.length ? `${first.productName} و${rest.length} غيرها` : first.productName;
}
