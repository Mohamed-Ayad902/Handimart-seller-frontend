"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import { CaretLeft, CaretRight, FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusMark } from "@/components/ui/StatusTag";
import { formatAgo, formatCount, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, type OrderFilters, type OrderStatus, type PaymentStatus, type SellerOrder } from "@/lib/types";
import { findCachedOrder, useOrders } from "./api";
import { OrderPanel } from "./OrderPanel";
import { PAYMENT_METHOD, PAYMENT_STATUS, STATUS, TABS, itemsSummary, orderRef } from "./status";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENTS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

/** Filters live in the URL, so a filtered view can be bookmarked, shared or reloaded. Unknown values are dropped. */
function readFilters(params: URLSearchParams): { filters: OrderFilters; page: number } {
  const status = params.get("status");
  const pay = params.get("payment");
  const start = params.get("from");
  const end = params.get("to");
  const filters: OrderFilters = {};
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) filters.status = status as OrderStatus;
  if (pay && (PAYMENTS as string[]).includes(pay)) filters.paymentStatus = pay as PaymentStatus;
  const search = params.get("search")?.trim().slice(0, 80);
  if (search) filters.search = search;
  if (start && DATE.test(start)) filters.startDate = start;
  if (end && DATE.test(end)) filters.endDate = end;
  const page = Math.max(0, Math.min(10_000, Number.parseInt(params.get("page") ?? "0", 10) || 0));
  return { filters, page };
}

export function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const client = useQueryClient();
  const { filters, page } = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const openId = params.get("open");
  const orders = useOrders(filters, page);

  const setParams = useCallback(
    (changes: Record<string, string | null>, { resetPage = true } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (resetPage && !("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // The open order: from this page, else any cached page (there is no GET-by-id, handover G1).
  const openOrder: SellerOrder | null = openId ? (orders.data?.content.find((o) => o.id === openId) ?? findCachedOrder(client, openId)) : null;
  const missing = Boolean(openId) && !openOrder && !orders.isPending;

  const tab = TABS.find((t) => t.status === (filters.status ?? null)) ?? TABS[0]!;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="enter text-meta font-bold text-accent-text">خط الشغل</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          الطلبات
        </h1>
      </header>

      <StatusTabs active={filters.status ?? null} onSelect={(s) => setParams({ status: s })} />
      <Filters filters={filters} onChange={setParams} />

      {orders.isPending ? (
        <ListSkeleton />
      ) : orders.isError ? (
        <StateView
          illustration="tangledThread"
          title="معرفناش نجيب الطلبات"
          body="معرفناش نجيب الطلبات. تقدر تحاول مرة تاني؟"
          action={
            <Button onClick={() => orders.refetch()} disabled={orders.isFetching}>
              حاول مرة أخرى
            </Button>
          }
        />
      ) : orders.data.content.length === 0 ? (
        filters.search ? (
          <StateView illustration="threadSearch" title={`مفيش نتيجة لـ «${filters.search}»`} body="جرّب اسم العميل أو رقم الموبايل." />
        ) : (
          <StateView illustration="emptyBasket" title={tab.empty.title} body={tab.empty.body} />
        )
      ) : (
        <>
          <p className="text-meta text-ink-3" aria-live="polite">
            {formatCount(orders.data.totalElements)} طلب{orders.isFetching ? "، بنحدّث..." : ""}
          </p>
          <OrderTable orders={orders.data.content} onOpen={(id) => setParams({ open: id }, { resetPage: false })} dimmed={orders.isPlaceholderData} />
          <Pager page={page} totalPages={orders.data.totalPages} onPage={(p) => setParams({ page: p ? String(p) : null })} />
        </>
      )}

      <OrderPanel order={openOrder} missing={missing} onClose={() => setParams({ open: null }, { resetPage: false })} />
    </div>
  );
}

function StatusTabs({ active, onSelect }: { active: OrderStatus | null; onSelect: (s: string | null) => void }) {
  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <div role="tablist" aria-label="حالة الطلب" className="flex w-max gap-1 border-b border-divider">
        {TABS.map((t) => {
          const selected = t.status === active;
          return (
            <button
              key={t.label}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onSelect(t.status)}
              className={`relative min-h-11 px-3.5 text-body-sm whitespace-nowrap transition-colors duration-quick ${selected ? "font-extrabold text-ink" : "font-semibold text-ink-2 hover:text-ink"}`}
            >
              {t.label}
              {selected && <m.span layoutId="orders-tab" aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Search (debounced), payment state and a date range. Checked before any request is sent. */
function Filters({ filters, onChange }: { filters: OrderFilters; onChange: (c: Record<string, string | null>) => void }) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [from, setFrom] = useState(filters.startDate ?? "");
  const [to, setTo] = useState(filters.endDate ?? "");
  const [open, setOpen] = useState(Boolean(filters.startDate || filters.endDate || filters.paymentStatus));
  const dateError = from && to && to < from ? "تاريخ الانتهاء مينفعش يكون قبل تاريخ البدء" : null;

  // keep the box in step when the URL changes from elsewhere (top bar search, back button)
  const [seen, setSeen] = useState(filters.search ?? "");
  if ((filters.search ?? "") !== seen) {
    setSeen(filters.search ?? "");
    setSearch(filters.search ?? "");
  }

  useEffect(() => {
    const term = search.trim();
    if (term === (filters.search ?? "")) return;
    const id = window.setTimeout(() => onChange({ search: term || null }), 350);
    return () => window.clearTimeout(id);
  }, [search, filters.search, onChange]);

  const active = Boolean(filters.search || filters.startDate || filters.endDate || filters.paymentStatus);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <label htmlFor="orders-search" className="sr-only">
            دوّر في الطلبات
          </label>
          <MagnifyingGlass className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            id="orders-search"
            type="search"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم العميل أو رقم موبايله"
            className="h-12 w-full rounded-control border border-line-strong bg-surface ps-11 pe-4 text-body placeholder:text-ink-3 focus:border-ink"
          />
        </div>
        <Button variant="quiet" aria-expanded={open} aria-controls="order-filters" onClick={() => setOpen((o) => !o)}>
          <FunnelSimple className="size-5" aria-hidden="true" />
          فلترة
        </Button>
        {active && (
          <Button
            variant="quiet"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
              onChange({ search: null, from: null, to: null, payment: null });
            }}
          >
            <X className="size-5" aria-hidden="true" />
            امسح الفلاتر
          </Button>
        )}
      </div>

      {open && (
        <form
          id="order-filters"
          noValidate
          className="page-enter grid gap-3 rounded-image bg-surface p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (dateError) return;
            onChange({ from: from || null, to: to || null });
          }}
        >
          <TextField id="from" label="من يوم" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          <TextField id="to" label="لحد يوم" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} error={dateError} />
          <SelectField id="payment" label="حالة الدفع" value={filters.paymentStatus ?? ""} onChange={(e) => onChange({ payment: e.target.value || null })}>
            <option value="">الكل</option>
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>
                {PAYMENT_STATUS[p]}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="secondary" className="sm:mt-6.5" disabled={Boolean(dateError)}>
            طبّق التاريخ
          </Button>
        </form>
      )}
    </div>
  );
}

function OrderTable({ orders, onOpen, dimmed }: { orders: SellerOrder[]; onOpen: (id: string) => void; dimmed: boolean }) {
  return (
    <div className={`transition-opacity duration-standard ${dimmed ? "opacity-60" : ""}`}>
      {/* desktop and tablet: a real table */}
      <table className="hidden w-full border-separate border-spacing-y-1.5 text-body-sm md:table">
        <caption className="sr-only">قائمة الطلبات. اختار طلب عشان تشوف تفاصيله.</caption>
        <thead>
          <tr className="text-meta text-ink-3">
            <th scope="col" className="px-4 pb-1 text-start font-bold">الطلب</th>
            <th scope="col" className="px-4 pb-1 text-start font-bold">العميل</th>
            <th scope="col" className="px-4 pb-1 text-start font-bold max-lg:hidden">الدفع</th>
            <th scope="col" className="px-4 pb-1 text-start font-bold">صافي ليك</th>
            <th scope="col" className="px-4 pb-1 text-start font-bold">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="group relative bg-surface transition-[background-color,transform] duration-quick hover:bg-surface-raised motion-safe:hover:-translate-y-px">
              <td className="rounded-s-image px-4 py-3">
                <button type="button" onClick={() => onOpen(o.id)} className="block text-start after:absolute after:inset-0 focus-visible:outline-none">
                  <span className="block max-w-[22rem] truncate font-bold">{itemsSummary(o)}</span>
                  <span className="block text-meta text-ink-3">
                    <bdi dir="ltr">{orderRef(o.id)}</bdi> · {formatAgo(o.createdAt)}
                  </span>
                </button>
              </td>
              <td className="px-4 py-3">{o.customerName ?? "-"}</td>
              <td className="px-4 py-3 text-ink-2 max-lg:hidden">
                {PAYMENT_METHOD[o.paymentMethod] ?? o.paymentMethod}
                <span className="block text-meta text-ink-3">{PAYMENT_STATUS[o.paymentStatus] ?? o.paymentStatus}</span>
              </td>
              <td className="px-4 py-3 font-extrabold">{formatPrice(o.netEarning)}</td>
              <td className="rounded-e-image px-4 py-3">
                <StatusMark tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusMark>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* phones: one card per order */}
      <ul className="flex flex-col gap-2 md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => onOpen(o.id)} className="flex w-full flex-col gap-2 rounded-image bg-surface p-4 text-start active:scale-[0.99]">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-bold">{itemsSummary(o)}</span>
                  <span className="block text-meta text-ink-3">
                    {o.customerName ?? "عميل"} · {formatAgo(o.createdAt)}
                  </span>
                </span>
                <StatusMark tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusMark>
              </span>
              <span className="flex items-center justify-between text-meta text-ink-3">
                <bdi dir="ltr">{orderRef(o.id)}</bdi>
                <span className="text-body-sm font-extrabold text-ink">{formatPrice(o.netEarning)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="صفحات الطلبات" className="flex items-center justify-center gap-3">
      <Button variant="quiet" onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label="الصفحة اللي قبلها">
        <CaretRight className="size-5" aria-hidden="true" />
      </Button>
      <span className="text-body-sm font-bold">
        صفحة {page + 1} من {totalPages}
      </span>
      <Button variant="quiet" onClick={() => onPage(page + 1)} disabled={page + 1 >= totalPages} aria-label="الصفحة اللي بعدها">
        <CaretLeft className="size-5" aria-hidden="true" />
      </Button>
    </nav>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="بنحمّل الطلبات">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
