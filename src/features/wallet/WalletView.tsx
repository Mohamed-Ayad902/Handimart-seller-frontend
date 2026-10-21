"use client";

import Link from "next/link";
import { useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, CalendarBlank, HandCoins, Warning } from "@phosphor-icons/react";
import { CountUp } from "@/components/motion/CountUp";
import { RevealGroup } from "@/components/motion/Reveal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag } from "@/components/ui/StatusTag";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatCount, formatDateTime, formatPrice } from "@/lib/format";
import type { ChartRange, LedgerEntry, PayoutRequest, Wallet } from "@/lib/types";
import { parseNumber } from "@/lib/validation";
import { useWallet } from "@/features/home/api";
import { PAYOUT } from "@/features/store/api";
import { useEarnings, useLedger, usePayoutRequests, useRequestPayout } from "./api";
import { EarningsBars } from "./EarningsBars";
import { dayLabel, groupByDay, ledgerKind, ledgerMeaning, ledgerSign, ledgerTitle, payoutReference, payoutStatus } from "./ledger";
import { E, useTrackOpen } from "@/lib/observability/analytics";

export function WalletView() {
  useTrackOpen(E.WALLET_SCREEN_OPENED);
  const wallet = useWallet();
  const [withdrawing, setWithdrawing] = useState(false);

  return (
    <RevealGroup className="flex flex-col gap-8 lg:gap-10">
      <header>
        <p className="enter text-meta font-bold text-accent-text">فلوس ورشتك</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          المحفظة
        </h1>
      </header>

      <Balances wallet={wallet.data} loading={wallet.isPending} failed={wallet.isError} onWithdraw={() => setWithdrawing(true)} />
      <Earnings />
      <History />

      {wallet.data && <WithdrawDialog open={withdrawing} onClose={() => setWithdrawing(false)} wallet={wallet.data} />}
    </RevealGroup>
  );
}

/* ---------------------------------------------------------------- balances */

function Balances({ wallet, loading, failed, onWithdraw }: { wallet: Wallet | undefined; loading: boolean; failed: boolean; onWithdraw: () => void }) {
  if (failed) return <SectionError message="معرفناش نجيب بيانات محفظتك. جرّب تحدّث الصفحة بعد شوية." />;
  const method = wallet?.payoutMethod ? PAYOUT[wallet.payoutMethod] : null;

  return (
    <section data-reveal="" aria-labelledby="balance-title" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* The available balance: a pinned ticket, like the home "needs you" card. */}
      <div className="relative overflow-hidden rounded-image-lg bg-secondary p-6 text-on-secondary sm:p-8 lg:col-span-7">
        <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[18px] border-[1.5px] border-dashed border-on-secondary/25" />
        <HandCoins aria-hidden="true" weight="thin" className="pointer-events-none absolute -bottom-6 -start-6 size-44 text-on-secondary/10 motion-safe:transition-transform motion-safe:duration-emphasized" />
        <div className="relative">
          <h2 id="balance-title" className="text-meta font-bold text-on-secondary-accent">
            الرصيد المتاح
          </h2>
          {loading || !wallet ? (
            <Skeleton className="mt-3 h-12 w-1/2 bg-on-secondary/10" />
          ) : (
            <p className="mt-1 text-display font-extrabold">
              <CountUp value={wallet.availableBalance} format={formatPrice} />
            </p>
          )}
          <p className="mt-1 text-body-sm opacity-85">الفلوس اللي تقدر تسحبها دلوقتي</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onWithdraw} disabled={!wallet || wallet.availableBalance <= 0}>
              اسحب أرباحك
            </Button>
            {wallet && wallet.availableBalance <= 0 && <span className="text-body-sm opacity-85">مفيش رصيد متاح للسحب دلوقتي</span>}
          </div>

          <p className="mt-5 text-body-sm">
            {wallet == null ? null : method ? (
              <>
                بتستلم على <strong>{method.label}</strong>
                {wallet.payoutAccountIdentifier && (
                  <>
                    {" "}
                    · <bdi dir="ltr">{wallet.payoutAccountIdentifier}</bdi>
                  </>
                )}
                {" · "}
                <Link href="/store" className="underline decoration-dashed underline-offset-4 hover:text-on-secondary-accent">
                  غيّرها
                </Link>
              </>
            ) : (
              <Link href="/store" className="inline-flex items-center gap-1.5 font-bold text-on-secondary-accent underline decoration-dashed underline-offset-4">
                حدد طريقة استلام الأرباح الأول
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            )}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
        <Figure label="محجوز لحد ما الطلبات تكتمل" hint="بيتحرر لرصيدك المتاح بعد تسليم الطلب" value={wallet?.pendingBalance} loading={loading} />
        <Figure label="إجمالي أرباحك" hint="كل اللي كسبته من أول ما بدأت" value={wallet?.lifetimeEarnings} loading={loading} />
        <Figure
          label="عمولة مستحقة للمنصة"
          hint={wallet && wallet.commissionDebt > 0 ? "هتتخصم من أرباحك الجاية" : "مفيش عليك عمولة متأخرة"}
          value={wallet?.commissionDebt}
          loading={loading}
          warn={(wallet?.commissionDebt ?? 0) > 0}
        />
      </dl>
    </section>
  );
}

function Figure({ label, hint, value, loading, warn = false }: { label: string; hint: string; value: number | undefined; loading: boolean; warn?: boolean }) {
  return (
    <div className={`card-lift flex flex-col justify-center rounded-image border p-4 sm:p-5 ${warn ? "border-warning/40 bg-warning-container/50" : "border-line bg-surface"}`}>
      <dt className="flex items-center gap-1.5 text-meta font-bold text-ink-2">
        {warn && <Warning className="size-4 text-warning" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 text-price-lg font-extrabold">{loading || value == null ? <Skeleton className="h-8 w-28" /> : <CountUp value={value} format={formatPrice} />}</dd>
      <dd className="text-meta text-ink-3">{hint}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------- earnings chart */

const RANGES: { range: ChartRange; label: string }[] = [
  { range: "LAST_7_DAYS", label: "7 أيام" },
  { range: "TODAY", label: "النهاردة" },
  { range: "LAST_MONTH", label: "الشهر اللي فات" },
  { range: "CUSTOM", label: "تاريخ مخصص" },
];

/** The backend's custom-range limit (`MAX_CUSTOM_CHART_RANGE_DAYS`), counted inclusively. */
const MAX_DAYS = 90;
const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Same rules the backend applies, so a bad range never leaves the browser. Dates are UTC like the backend's. */
function rangeProblem(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (start > end) return "تاريخ الانتهاء مينفعش يكون قبل تاريخ البدء";
  if (end > todayUtc()) return "مينفعش تختار تاريخ في المستقبل";
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_DAYS) return `أقصى مدة ${MAX_DAYS} يوم`;
  return null;
}

function Earnings() {
  const [range, setRange] = useState<ChartRange>("LAST_7_DAYS");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const problem = range === "CUSTOM" ? rangeProblem(start, end) : null;
  const ready = range !== "CUSTOM" || (!!start && !!end && !problem);
  const chart = useEarnings(range, ready && range === "CUSTOM" ? start : null, ready && range === "CUSTOM" ? end : null);
  const total = chart.data?.reduce((s, b) => s + b.amount, 0) ?? 0;
  const label = RANGES.find((r) => r.range === range)!.label;

  return (
    <section data-reveal="" aria-labelledby="earnings-title" className="rounded-image-lg border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-meta font-bold text-accent-text">بتكسب قد إيه</p>
          <h2 id="earnings-title" className="text-title font-extrabold">
            أرباحك
          </h2>
        </div>
        <div className="text-end" aria-live="polite">
          <p className="text-meta font-bold text-ink-2">إجمالي الفترة دي</p>
          <p className="text-price-lg font-extrabold">{chart.isSuccess ? formatPrice(total) : "—"}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="فترة الرسم" className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {RANGES.map((r) => {
          const on = r.range === range;
          return (
            <button
              key={r.range}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRange(r.range)}
              className={`relative min-h-10 shrink-0 rounded-full border px-4 text-body-sm font-bold transition-colors duration-quick ${on ? "border-transparent text-on-secondary" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"}`}
            >
              {on && <m.span layoutId="earnings-range" aria-hidden="true" className="absolute inset-0 rounded-full bg-secondary" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
              <span className="relative">{r.label}</span>
            </button>
          );
        })}
      </div>

      {range === "CUSTOM" && (
        <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField id="chart-start" label="تاريخ البدء" type="date" value={start} max={end || todayUtc()} onChange={(e) => setStart(e.target.value)} />
          <TextField id="chart-end" label="تاريخ الانتهاء" type="date" value={end} min={start || undefined} max={todayUtc()} onChange={(e) => setEnd(e.target.value)} error={problem} hint={`لحد ${MAX_DAYS} يوم، بتوقيت جرينتش زي التطبيق`} />
        </div>
      )}

      <div className="mt-6">
        {range === "CUSTOM" && !ready ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-image bg-surface-sunken/60 text-center text-body-sm text-ink-2 sm:h-56">
            <CalendarBlank className="size-8 text-ink-3" aria-hidden="true" />
            {problem ? "عدّل التواريخ عشان نعرض الرسم" : "اختار تاريخ البدء والانتهاء"}
          </div>
        ) : chart.isPending ? (
          <Skeleton className="h-56 sm:h-64" />
        ) : chart.isError ? (
          <SectionError message={chart.error instanceof ApiError ? chart.error.message : undefined} />
        ) : total === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-image bg-surface-sunken/60 px-6 text-center text-body-sm text-ink-2 sm:h-56">
            مفيش أرباح اتسجلت في الفترة دي. الأرباح بتظهر لما الطلبات تكتمل.
          </div>
        ) : (
          <EarningsBars buckets={chart.data} caption={`أرباحك في فترة ${label}، الإجمالي ${formatPrice(total)}`} />
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- ledger and payout history */

function History() {
  const [tab, setTab] = useState<"ledger" | "payouts">("ledger");
  const tabs = [
    { id: "ledger", label: "كشف حسابك" },
    { id: "payouts", label: "طلبات السحب" },
  ] as const;
  return (
    <section data-reveal="" aria-label="حركات المحفظة" className="flex flex-col gap-4">
      <div role="tablist" aria-label="حركات المحفظة" className="flex w-max gap-1 border-b border-divider">
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              id={`wallet-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`wallet-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative min-h-11 px-3.5 text-body whitespace-nowrap transition-colors duration-quick ${on ? "font-extrabold text-ink" : "font-semibold text-ink-2 hover:text-ink"}`}
            >
              {t.label}
              {on && <m.span layoutId="wallet-tab" aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            </button>
          );
        })}
      </div>
      <div id={`wallet-panel-${tab}`} role="tabpanel" aria-labelledby={`wallet-tab-${tab}`}>
        {tab === "ledger" ? <Ledger /> : <Payouts />}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

function MoreButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <div className="mt-4 flex justify-center">
      <Button variant="quiet" onClick={onClick} disabled={busy} aria-busy={busy}>
        {busy && <Spinner />}
        اعرض أقدم
      </Button>
    </div>
  );
}

function Ledger() {
  const ledger = useLedger();
  const [open, setOpen] = useState<LedgerEntry | null>(null);

  if (ledger.isPending) return <ListSkeleton />;
  if (ledger.isError) return <SectionError message="معرفناش نجيب حركات حسابك." />;
  const entries = ledger.data.pages.flatMap((p) => p.content);
  if (!entries.length)
    return (
      <p className="rounded-image bg-surface p-6 text-center text-body-sm text-ink-2">
        لسه مفيش حركات على حسابك. أول ما طلب يتسلّم، هتلاقي فلوسه هنا.
      </p>
    );

  return (
    <>
      <div className="flex flex-col gap-5">
        {groupByDay(entries, (e) => e.createdAt).map((g) => (
          <div key={g.day}>
            <h3 className="mb-2 text-meta font-bold text-ink-3">{dayLabel(g.day)}</h3>
            <ul className="overflow-hidden rounded-image border border-line bg-surface">
              {g.items.map((e) => (
                <li key={e.id} className="border-b border-dashed border-line last:border-0">
                  <LedgerRow entry={e} onOpen={() => setOpen(e)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {ledger.hasNextPage && <MoreButton onClick={() => void ledger.fetchNextPage()} busy={ledger.isFetchingNextPage} />}
      <LedgerDetails entry={open} onClose={() => setOpen(null)} />
    </>
  );
}

function amountClass(e: LedgerEntry) {
  const k = ledgerKind(e);
  if (k.pending) return "text-ink-2";
  if (e.type === "REFUND_DEDUCTION") return "text-error";
  return k.incoming ? "text-success" : "text-ink";
}

function LedgerRow({ entry, onOpen }: { entry: LedgerEntry; onOpen: () => void }) {
  const k = ledgerKind(entry);
  const I = k.icon;
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-center gap-4 px-4 py-3 text-start transition-colors duration-quick hover:bg-paper">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-2 transition-transform duration-standard ease-soft group-hover:-rotate-6">
        <I className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-bold">{ledgerTitle(entry)}</span>
        <span className="block truncate text-meta text-ink-3">{ledgerMeaning(entry)}</span>
      </span>
      <span className="text-end">
        <span className={`block text-body-sm font-extrabold ${amountClass(entry)}`} dir="ltr">
          {ledgerSign(entry)}
          {formatPrice(Math.abs(entry.amount))}
        </span>
        {entry.type === "WITHDRAWAL" && entry.status === "PENDING" && <span className="block text-meta font-bold text-warning">قيد المراجعة</span>}
      </span>
    </button>
  );
}

function LedgerDetails({ entry, onClose }: { entry: LedgerEntry | null; onClose: () => void }) {
  const ref = entry ? payoutReference(entry) : null;
  return (
    <Dialog open={entry !== null} onClose={onClose} title="تفاصيل الحركة">
      {entry && (
        <>
          <div>
            <p className={`text-display font-extrabold ${amountClass(entry)}`} dir="ltr" style={{ textAlign: "right" }}>
              {ledgerSign(entry)}
              {formatPrice(Math.abs(entry.amount))}
            </p>
            <p className="text-subtitle font-bold">{ledgerTitle(entry)}</p>
            <p className="text-body-sm text-ink-2">{ledgerMeaning(entry)}</p>
          </div>
          <div className="stitch opacity-70" aria-hidden="true" />
          <dl className="grid grid-cols-2 gap-4 text-body-sm">
            <Detail label="نوع الحركة" value={ledgerKind(entry).label} />
            <Detail label="بتأثر على" value={ledgerKind(entry).pending ? "الرصيد المعلق" : "الرصيد المتاح"} />
            <Detail label="التاريخ" value={formatDateTime(entry.createdAt)} />
            <Detail label="رقم الحركة" value={<bdi dir="ltr">#{entry.id.slice(0, 8).toUpperCase()}</bdi>} />
            {ref && <Detail label="ملاحظة" value={<bdi dir="ltr">{ref}</bdi>} />}
          </dl>
          {entry.orderId && entry.type !== "WITHDRAWAL" && (
            <Link href={`/orders?open=${entry.orderId}`} className="inline-flex min-h-11 items-center gap-1.5 self-start text-body-sm font-bold hover:text-accent-text">
              افتح الطلب
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Button variant="quiet" onClick={onClose}>
            تمام
          </Button>
        </>
      )}
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-meta font-bold text-ink-3">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function Payouts() {
  const payouts = usePayoutRequests();
  if (payouts.isPending) return <ListSkeleton />;
  if (payouts.isError) return <SectionError message="معرفناش نجيب طلبات السحب." />;
  const list = payouts.data.pages.flatMap((p) => p.content);
  if (!list.length) return <p className="rounded-image bg-surface p-6 text-center text-body-sm text-ink-2">لسه مطلبتش سحب. لما تطلب، هتتابع حالته من هنا.</p>;
  return (
    <>
      <p className="mb-3 text-meta text-ink-3">{formatCount(payouts.data.pages[0]?.totalElements ?? list.length)} طلب</p>
      <ul className="overflow-hidden rounded-image border border-line bg-surface">
        {list.map((p) => (
          <PayoutRow key={p.id} payout={p} />
        ))}
      </ul>
      {payouts.hasNextPage && <MoreButton onClick={() => void payouts.fetchNextPage()} busy={payouts.isFetchingNextPage} />}
    </>
  );
}

function PayoutRow({ payout }: { payout: PayoutRequest }) {
  const s = payoutStatus(payout);
  const method = payout.payoutMethodSnapshot && payout.payoutMethodSnapshot in PAYOUT ? PAYOUT[payout.payoutMethodSnapshot as keyof typeof PAYOUT].label : null;
  return (
    <li className="flex flex-col gap-2 border-b border-dashed border-line px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-body font-extrabold">{formatPrice(payout.amount)}</p>
        <p className="text-meta text-ink-3">
          اتطلب {formatDateTime(payout.requestedAt)}
          {method && ` · ${method}`}
        </p>
        {payout.decidedAt && <p className="text-meta text-ink-3">اتقرر {formatDateTime(payout.decidedAt)}</p>}
        {payout.referenceNote && (
          <p className="mt-1 text-body-sm text-ink-2">
            {payout.status === "REJECTED" ? "السبب: " : "رقم التحويل: "}
            <bdi>{payout.referenceNote}</bdi>
          </p>
        )}
      </div>
      <StatusTag tone={s.tone} className="self-start sm:self-center">
        {s.label}
      </StatusTag>
    </li>
  );
}

/* ---------------------------------------------------------------- withdraw */

/** 1240.567 -> "1240.56": all of it, without rounding past the balance. */
function plainAmount(n: number) {
  const cents = Math.floor(n * 100 + 1e-6);
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Core `validatePrice(min 0.01, max available)`; the backend checks the real balance again. */
function amountProblem(v: string, available: number): string | null {
  if (!v.trim()) return "الحقل ده مطلوب";
  const n = parseNumber(v);
  if (n === null) return "اكتب رقم صحيح";
  if (!/^\d+(\.\d{1,2})?$/.test(String(n))) return "المبلغ لازم يكون لحد قرشين بس";
  if (n < 0.01) return "لازم القيمة متقلش عن 0.01";
  if (n > available) return "مش هتقدر تسحب أكتر من رصيدك المتاح.";
  return null;
}

function WithdrawDialog({ open, onClose, wallet }: { open: boolean; onClose: () => void; wallet: Wallet }) {
  const request = useRequestPayout();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const problem = amountProblem(amount, wallet.availableBalance);
  const method = wallet.payoutMethod ? PAYOUT[wallet.payoutMethod] : null;

  const close = () => {
    if (request.isPending) return;
    setAmount("");
    setTouched(false);
    setServerError(null);
    request.reset();
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || request.isPending) return;
    setServerError(null);
    request.mutate(parseNumber(amount)!, {
      onSuccess: () => {
        toast.show("طلب السحب اتبعت، وهنبلغك أول ما يتحوّل");
        close();
      },
      onError: (err) => setServerError(err instanceof ApiError ? err.message : "حصلت مشكلة. جرّب تاني بعد شوية."),
    });
  };

  return (
    <Dialog open={open} onClose={close} title="سحب الأرباح" locked={request.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-ink-2">اكتب المبلغ اللي عايز تسحبه من رصيدك المتاح</p>
        <div className="rounded-image bg-surface-sunken/60 p-4">
          <p className="text-meta font-bold text-ink-2">الرصيد المتاح</p>
          <p className="text-price-lg font-extrabold">{formatPrice(wallet.availableBalance)}</p>
          <p className="mt-1 text-meta text-ink-3">
            {method ? (
              <>
                هيتحوّل على {method.label}
                {wallet.payoutAccountIdentifier && (
                  <>
                    {" "}
                    · <bdi dir="ltr">{wallet.payoutAccountIdentifier}</bdi>
                  </>
                )}
              </>
            ) : (
              <span className="font-bold text-warning">لازم تحدد طريقة استلام الأرباح الأول من صفحة متجري.</span>
            )}
          </p>
        </div>
        <TextField
          id="withdraw-amount"
          label="المبلغ"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^\d.٠-٩٫]/g, ""));
            setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          error={(touched ? problem : null) ?? serverError}
          dir="ltr"
          className="text-end"
        />
        <button type="button" onClick={() => setAmount(plainAmount(wallet.availableBalance))} className="self-start text-body-sm font-bold underline decoration-dashed underline-offset-4 hover:text-accent-text">
          اسحب الرصيد كله
        </button>
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={close} disabled={request.isPending}>
            رجوع
          </Button>
          {method ? (
            <Button type="submit" disabled={request.isPending} aria-busy={request.isPending}>
              {request.isPending && <Spinner />}
              أرسل الطلب
            </Button>
          ) : (
            <ButtonLink href="/store">حدد طريقة الاستلام</ButtonLink>
          )}
        </div>
      </form>
    </Dialog>
  );
}
