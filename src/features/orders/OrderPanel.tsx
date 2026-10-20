"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import { MapPin, Truck, User, X } from "@phosphor-icons/react";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { SellerOrder } from "@/lib/types";
import { JOURNEY, NEXT, PAYMENT_METHOD, PAYMENT_STATUS, STATUS, journeyStep, orderRef } from "./status";
import { OrderActions } from "./OrderActions";

/**
 * The order's detail as a side panel over the list (a full sheet on phones): its journey, what
 * to do next, the pieces, the money, and where it goes. Escape or the close button returns focus
 * to the list.
 */
export function OrderPanel({ order, missing, onClose }: { order: SellerOrder | null; missing: boolean; onClose: () => void }) {
  const open = Boolean(order) || missing;
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div key="scrim" className="fixed inset-0 z-(--z-overlay) bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
          <m.div
            key="panel"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-panel-title"
            tabIndex={-1}
            initial={{ x: "-104%" }}
            animate={{ x: 0 }}
            exit={{ x: "-104%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="fixed inset-y-0 end-0 z-(--z-dialog) flex w-full max-w-xl flex-col bg-paper shadow-[0_0_80px_-20px_rgb(42_19_48/0.5)] outline-none sm:inset-y-2 sm:end-2 sm:rounded-sheet"
          >
            {order ? <Detail order={order} onClose={onClose} /> : <Missing onClose={onClose} />}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="إغلاق تفاصيل الطلب" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken">
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}

function Missing({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex justify-end">
        <CloseButton onClose={onClose} />
      </div>
      <h2 id="order-panel-title" className="mt-10 text-title font-extrabold">
        الطلب ده مش في القائمة اللي قدامك
      </h2>
      <p className="mt-2 text-body text-ink-2">مفيش طريقة نفتح طلب لوحده برقمه لسه، فدوّر عليه في القائمة باسم العميل أو غيّر الفلتر وافتحه من هناك.</p>
    </div>
  );
}

function Detail({ order, onClose }: { order: SellerOrder; onClose: () => void }) {
  const s = STATUS[order.status];
  const next = NEXT[order.status];
  const step = journeyStep(order.status);
  const addr = order.shippingAddress;
  const line = [addr?.street, addr?.building && `عمارة ${addr.building}`, addr?.floor && `الدور ${addr.floor}`, addr?.apartment && `شقة ${addr.apartment}`].filter(Boolean).join("، ");

  return (
    <>
      <div className="flex items-start gap-3 border-b border-divider px-5 pt-5 pb-4 sm:px-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="order-panel-title" className="text-title font-extrabold">
              طلب <bdi dir="ltr">{orderRef(order.id)}</bdi>
            </h2>
            <StatusTag tone={s.tone}>{s.label}</StatusTag>
          </div>
          <p className="mt-0.5 text-meta text-ink-3">{formatDateTime(order.createdAt)}</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7" data-lenis-prevent="">
        {step >= 0 && (
          <ol className="mb-6 grid grid-cols-5 gap-1" aria-label="مسار الطلب">
            {JOURNEY.map((label, i) => (
              <li key={label} className="flex flex-col gap-1.5">
                <span aria-hidden="true" className={`h-1 rounded-full ${i < step ? "bg-ink" : i === step ? "bg-primary" : "bg-[repeating-linear-gradient(to_left,var(--hm-border-strong)_0_6px,transparent_6px_10px)]"}`} />
                <span className={`text-[0.6875rem] ${i === step ? "font-extrabold text-ink" : i < step ? "font-semibold text-ink-2" : "text-ink-3"}`}>
                  {label}
                  {i === step && <span className="sr-only"> (دلوقتي)</span>}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className={`rounded-image p-4 ${order.status === "PENDING" ? "bg-primary-container text-on-primary-container" : "bg-surface"}`}>
          <p className="text-subtitle font-extrabold">{next.title}</p>
          <p className="mt-0.5 text-body-sm opacity-90">{next.body}</p>
        </div>

        <h3 className="mt-7 mb-2 text-subtitle font-extrabold">عناصر الطلب</h3>
        <ul className="flex flex-col gap-3">
          {order.items.map((item, i) => (
            <li key={`${item.productName}-${i}`} className="rounded-image border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{item.productName}</p>
                <p className="shrink-0 font-extrabold">{formatPrice(item.subtotal)}</p>
              </div>
              <p className="text-meta text-ink-3">
                <bdi>
                  {item.quantity} × {formatPrice(item.pricePerUnit)}
                </bdi>
              </p>
              {item.selectedAttributes && <p className="mt-2 text-body-sm text-ink-2">{item.selectedAttributes}</p>}
              {item.customizationNotes && (
                <p className="mt-2 rounded-control bg-paper p-2.5 text-body-sm">
                  <span className="font-bold">ملاحظة العميل: </span>
                  {item.customizationNotes}
                </p>
              )}
              {item.customRequestId && <p className="mt-2 text-meta font-bold text-accent-text">معمول حسب طلب تفصيل</p>}
            </li>
          ))}
        </ul>

        <h3 className="mt-7 mb-2 text-subtitle font-extrabold">الحساب</h3>
        <dl className="flex flex-col gap-2 rounded-image bg-surface p-4 text-body-sm">
          <Row label="إجمالي القطع" value={formatPrice(order.itemsSubtotal)} />
          <Row label="عمولة هانديمارت" value={`- ${formatPrice(order.platformCommission)}`} />
          {order.platformFeeSaved ? <Row label="وفّرت من العمولة (مكافأة هدف)" value={formatPrice(order.platformFeeSaved)} /> : null}
          <div className="stitch my-1 opacity-70" aria-hidden="true" />
          <Row label="صافي ليك" value={formatPrice(order.netEarning)} strong />
        </dl>

        <h3 className="mt-7 mb-2 text-subtitle font-extrabold">التوصيل والدفع</h3>
        <dl className="flex flex-col gap-3 text-body-sm">
          <Info icon={<User className="size-5" aria-hidden="true" />} label="العميل" value={order.customerName ?? "-"} />
          <Info
            icon={<MapPin className="size-5" aria-hidden="true" />}
            label="العنوان"
            value={[addr?.regionPath ?? [addr?.city, addr?.district].filter(Boolean).join("، "), line || addr?.detailedAddress].filter(Boolean).join(" - ") || "-"}
          />
          <Info icon={<Truck className="size-5" aria-hidden="true" />} label="الشحن" value={order.trackingNumber ? `${order.shippingCompany ?? ""} ${order.trackingNumber}`.trim() : order.estimatedDeliveryDays ? `التوصيل المتوقع خلال ${order.estimatedDeliveryDays} يوم` : "لسه مااتشحنش"} />
          <div className="flex flex-wrap gap-2 pt-1">
            <StatusTag tone="neutral">{PAYMENT_METHOD[order.paymentMethod] ?? order.paymentMethod}</StatusTag>
            <StatusTag tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "neutral"}>{PAYMENT_STATUS[order.paymentStatus] ?? order.paymentStatus}</StatusTag>
          </div>
        </dl>
      </div>

      <OrderActions order={order} className="border-t border-divider bg-paper px-5 py-4 sm:px-7" />
    </>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-extrabold" : "text-ink-2"}>{label}</dt>
      <dd className={strong ? "text-price font-extrabold" : "font-bold"}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <div>
        <dt className="text-meta text-ink-3">{label}</dt>
        <dd className="font-semibold">{value}</dd>
      </div>
    </div>
  );
}
