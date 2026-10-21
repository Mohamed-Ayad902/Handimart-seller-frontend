import type { StatusTone } from "@/components/ui/StatusTag";
import type { Discount, DiscountType } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export const NAME_MAX = 100;

export const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  RUNNING: { label: "شغّال", tone: "success" },
  SCHEDULED: { label: "مجدول", tone: "warning" },
  EXHAUSTED: { label: "خلص", tone: "danger" },
  EXPIRED: { label: "انتهى", tone: "neutral" },
  DISABLED: { label: "موقوف", tone: "neutral" },
};

export function discountStatus(d: Discount) {
  return STATUS[d.status] ?? { label: "غير معروف", tone: "neutral" as StatusTone };
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** What the coupon says: "-20٪", "-50 ج.م", or "شحن مجاني". */
export function valueLabel(type: DiscountType, value: number): string {
  if (type === "PERCENTAGE") return `-${number.format(value)}%`;
  if (type === "FIXED_AMOUNT") return `-${formatPrice(value)}`;
  return "شحن مجاني";
}

export function targetLabel(d: Discount): string {
  const n = d.productIds.length;
  if (!n) return "كل قطع المتجر";
  if (n === 1) return d.productName ? `على ${d.productName}` : "على قطعة واحدة";
  return `على ${number.format(n)} قطع`;
}

/** The piece's price once the offer applies (from its list price), or null without an amount. */
export function priceWith(base: number, type: DiscountType, value: number): number | null {
  if (!(value > 0)) return null;
  if (type === "PERCENTAGE") return Math.max(0, base * (1 - value / 100));
  if (type === "FIXED_AMOUNT") return Math.max(0, base - value);
  return null;
}

/** `datetime-local` value in the seller's own clock, and back to an instant. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
