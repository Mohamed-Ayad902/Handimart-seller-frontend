import type { Icon } from "@phosphor-icons/react";
import { ArrowCounterClockwise, Coins, FileText, Hourglass, PaperPlaneTilt, Receipt, Rocket } from "@phosphor-icons/react";
import type { StatusTone } from "@/components/ui/StatusTag";
import type { LedgerEntry, PayoutRequest } from "@/lib/types";
import { orderRef } from "@/features/orders/status";

/**
 * How a wallet movement is told to the seller, ported from the app's `TransactionPresentation`.
 * The backend stores a type, an amount and an English note; the title, meaning, icon, tone and
 * sign are all derived from the type so the wallet speaks in business terms, not records.
 */
interface Kind {
  label: string;
  icon: Icon;
  tone: StatusTone;
  /** Adds to the balance it touches. */
  incoming: boolean;
  /** Holds and their reversals move the pending balance; the rest move the available one. */
  pending: boolean;
  title: (ref: string | null) => string;
  meaning: string;
}

const KINDS: Record<string, Kind> = {
  EARNING: { label: "أرباح", icon: Coins, tone: "success", incoming: true, pending: false, title: (r) => (r ? `أرباح طلب ${r}` : "أرباح طلب"), meaning: "اتضافت لرصيدك المتاح" },
  ESCROW_HOLD: { label: "محجوز مؤقت", icon: Hourglass, tone: "progress", incoming: true, pending: true, title: (r) => (r ? `فلوس طلب ${r} محجوزة` : "فلوس محجوزة"), meaning: "هتتحول لرصيدك المتاح لما الطلب يكتمل" },
  ESCROW_CANCELLED: { label: "إلغاء حجز", icon: ArrowCounterClockwise, tone: "neutral", incoming: false, pending: true, title: (r) => (r ? `طلب ${r} اترجّع` : "طلب اترجّع"), meaning: "الفلوس المحجوزة على الطلب اتلغت" },
  REFUND_DEDUCTION: { label: "خصم / استرجاع", icon: Receipt, tone: "danger", incoming: false, pending: false, title: (r) => (r ? `مرتجع طلب ${r}` : "خصم مرتجع"), meaning: "اتخصمت من رصيدك بعد مرتجع" },
  WITHDRAWAL: { label: "سحب", icon: PaperPlaneTilt, tone: "info", incoming: false, pending: false, title: () => "سحب أرباح", meaning: "" },
  // Not in the app yet: the backend logs it when a boost is paid from the wallet.
  BOOST_FEE: { label: "ترويج", icon: Rocket, tone: "neutral", incoming: false, pending: false, title: () => "مصاريف ترويج", meaning: "اتخصمت من رصيدك المتاح لحملة ترويج" },
};

const UNKNOWN: Kind = { label: "معاملة", icon: FileText, tone: "neutral", incoming: false, pending: false, title: () => "حركة على حسابك", meaning: "اتسجلت على حسابك" };

export function ledgerKind(entry: LedgerEntry): Kind {
  return KINDS[entry.type] ?? UNKNOWN;
}

/** Withdrawals carry no real order: the backend fills an id there that must never be shown as one. */
export function ledgerRef(entry: LedgerEntry): string | null {
  return entry.orderId && entry.type !== "WITHDRAWAL" ? orderRef(entry.orderId) : null;
}

export function ledgerTitle(entry: LedgerEntry) {
  return ledgerKind(entry).title(ledgerRef(entry));
}

export function ledgerMeaning(entry: LedgerEntry) {
  if (entry.type === "WITHDRAWAL") {
    if (entry.status === "PENDING") return "طلب السحب قيد المراجعة";
    if (entry.status === "COMPLETED") return "اتحوّلت على حسابك";
    return "طلب السحب اترفض، والفلوس رجعت لرصيدك";
  }
  return ledgerKind(entry).meaning;
}

/** "+" or a real minus sign, never a hyphen. */
export function ledgerSign(entry: LedgerEntry) {
  return ledgerKind(entry).incoming ? "+" : "−";
}

/** The payout reference from a "Payout: <ref>" note. Every other note is English system text and is not shown. */
export function payoutReference(entry: LedgerEntry): string | null {
  if (entry.type !== "WITHDRAWAL" || !entry.description) return null;
  const i = entry.description.indexOf("Payout:");
  const ref = i >= 0 ? entry.description.slice(i + 7).trim() : "";
  return ref || null;
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });
const dayHeading = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" });

/** Egypt's calendar day of an instant, `yyyy-mm-dd`. */
export function cairoDay(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dayKey.format(d);
}

/** "النهاردة", "امبارح", then the weekday and date (app `toDayHeading`). */
export function dayLabel(day: string, now = new Date()): string {
  const today = dayKey.format(now);
  const yesterday = dayKey.format(new Date(now.getTime() - 86_400_000));
  if (day === today) return "النهاردة";
  if (day === yesterday) return "امبارح";
  return dayHeading.format(new Date(`${day}T12:00:00Z`));
}

/** Groups an already newest-first ledger into consecutive days (app `LedgerGrouping`). */
export function groupByDay<T>(items: T[], at: (item: T) => string): { day: string; items: T[] }[] {
  const out: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = cairoDay(at(item)) ?? out.at(-1)?.day ?? "";
    const last = out.at(-1);
    if (last && last.day === day) last.items.push(item);
    else out.push({ day, items: [item] });
  }
  return out;
}

export const PAYOUT_STATUS: Record<string, { label: string; tone: StatusTone; body: string }> = {
  PENDING: { label: "قيد المراجعة", tone: "warning", body: "فريق HandiMart بيراجع الطلب، وهيتحوّل على وسيلة الدفع بتاعتك." },
  COMPLETED: { label: "اتحوّلت", tone: "success", body: "المبلغ اتحوّل على حسابك." },
  REJECTED: { label: "اترفض", tone: "danger", body: "الطلب اترفض، والمبلغ رجع لرصيدك المتاح." },
};

export function payoutStatus(p: PayoutRequest) {
  return PAYOUT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const, body: "" };
}
