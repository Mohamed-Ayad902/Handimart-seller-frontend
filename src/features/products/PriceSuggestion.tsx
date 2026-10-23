"use client";

import { useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { ArrowsClockwise, CaretLeft, ChartLineUp, Check, Coins, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Stitch } from "@/components/ui/Stitch";
import { StatusMark, StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { useForm } from "@/hooks/useForm";
import { ApiError } from "@/lib/client/api";
import { formatPrice } from "@/lib/format";
import { numberCheck, parseNumber } from "@/lib/validation";
import { useAcceptPrice, useSuggestPrice, type PriceConfidence, type PriceCosts, type PriceSuggestion, type PriceSuggestionRequest } from "./pricing";

type CostField = "materials" | "hours" | "packaging";

const money = numberCheck({ min: 0, max: 10_000_000, optional: true });
/** The backend caps labour at 1000 hours (`CostRequest.laborHours`). */
const COST_CHECKS = { materials: money, hours: numberCheck({ min: 0, max: 1000, optional: true }), packaging: money };

const CONFIDENCE: Record<PriceConfidence, { label: string; tone: StatusTone; ink: string }> = {
  HIGH: { label: "ثقة عالية", tone: "success", ink: "bg-success" },
  MEDIUM: { label: "ثقة متوسطة", tone: "info", ink: "bg-info" },
  LOW: { label: "ثقة ضعيفة", tone: "warning", ink: "bg-warning" },
  UNKNOWN: { label: "ثقة ضعيفة", tone: "neutral", ink: "bg-ink-3" },
};

const percent = (n: number) => `${Number(n.toFixed(1)).toLocaleString("en-US")}٪`;
const signedPercent = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${percent(Math.abs(n))}`;
/** A price as typed in the price field: plain digits, at most two decimals. */
const plain = (n: number) => String(Math.round(n * 100) / 100);

/** What the seller used, so a new piece can be linked to its suggestion once it is saved. */
export interface UsedSuggestion {
  suggestionId: string;
  price: number;
}

/**
 * "Calculate selling price" under the price field: the button, what came of it (the last
 * suggestion, whether it went stale, whether it was used) and the optional costs that sharpen it.
 * The quiet button on purpose: the page's one orange action stays "send for review".
 */
export function PriceSuggestionPanel({
  request,
  productId,
  currentPrice,
  onUse,
  onUsedChange,
}: {
  /** The piece as filled in so far, without costs; null while it has no category yet. */
  request: Omit<PriceSuggestionRequest, "costs"> | null;
  /** Set when editing: the choice is recorded against the piece straight away. */
  productId: string | null;
  currentPrice: number | null;
  onUse: (price: string) => void;
  onUsedChange: (used: UsedSuggestion | null) => void;
}) {
  const costs = useForm<CostField>({ materials: "", hours: "", packaging: "" }, COST_CHECKS);
  const materialsRef = useRef<HTMLInputElement>(null);
  const suggest = useSuggestPrice();
  const accept = useAcceptPrice();

  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; needsCosts: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [usedPrice, setUsedPrice] = useState<number | null>(null);

  const typedCosts = useMemo(() => readCosts(costs.values), [costs.values]);
  const key = request ? JSON.stringify({ ...request, costs: typedCosts }) : null;
  const stale = lastKey !== null && key !== lastKey;
  // Typing another price undoes "used": the line only stays while the field still holds it.
  const used = usedPrice !== null && currentPrice === usedPrice;

  const focusCosts = () => {
    setOpen(false);
    const input = materialsRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    input.focus({ preventScroll: true });
  };

  const calculate = () => {
    if (!request || suggest.isPending) return;
    if (!costs.validate()) {
      materialsRef.current?.closest("fieldset")?.scrollIntoView({ block: "center" });
      return;
    }
    setError(null);
    const body: PriceSuggestionRequest = { ...request, costs: typedCosts };
    suggest.mutate(body, {
      onSuccess: (result) => {
        // Editing: costs saved earlier come back in the breakdown; fill the empty fields with them
        // so the seller sees what the price was worked out from.
        const filled = { ...costs.values };
        const fill = (field: CostField, value: number | null | undefined) => {
          if (value != null && value > 0 && !filled[field].trim()) {
            filled[field] = plain(value);
            costs.set(field, filled[field]);
          }
        };
        fill("materials", result.cost?.materials);
        fill("hours", result.cost?.laborHours);
        fill("packaging", result.cost?.packaging);
        setSuggestion(result);
        setLastKey(JSON.stringify({ ...request, costs: readCosts(filled) }));
        setUsedPrice(null);
        onUsedChange(null);
        setOpen(true);
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "معرفناش نحسب السعر دلوقتي. جرّب تاني.";
        // 400 with nothing typed: too little market data and no costs to fall back on.
        setError({ message, needsCosts: err instanceof ApiError && err.status === 400 && !typedCosts });
      },
    });
  };

  const record = (s: PriceSuggestion, price: number) =>
    accept.mutate({ suggestionId: s.suggestionId, chosenPrice: price, productId: productId ?? undefined });

  const use = () => {
    if (!suggestion) return;
    const price = Number(plain(suggestion.suggestedPrice));
    onUse(plain(price));
    setUsedPrice(price);
    onUsedChange({ suggestionId: suggestion.suggestionId, price });
    setOpen(false);
    record(suggestion, price);
  };

  const busy = suggest.isPending;

  return (
    <div className="flex flex-col gap-5 rounded-image border-[1.5px] border-dashed border-line-strong bg-paper/60 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-meta font-bold text-accent-text">مش متأكد من السعر؟</p>
        <h3 className="text-subtitle font-extrabold">احسب سعر البيع</h3>
        <p className="text-body-sm text-ink-2">بنقارن قطعتك بقطع شبهها اتباعت على المنصة، ونضيف تكلفتك لو كتبتها.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="quiet" onClick={calculate} disabled={!request || busy} aria-busy={busy} className="w-full sm:w-fit">
          {busy ? <Spinner /> : <Coins className="size-5" aria-hidden="true" />}
          {busy ? "بنحسب السعر..." : suggestion ? "احسب تاني" : "احسب سعر البيع"}
        </Button>
        {!request && <p className="text-meta text-ink-3">اختار قسم القطعة في الخطوة الأولى عشان نقدر نحسب السعر.</p>}
      </div>

      <div className="flex flex-col gap-3 empty:hidden" aria-live="polite">
        {error && (
          <Notice tone={error.needsCosts ? "warning" : "danger"} action={error.needsCosts ? { label: "ضيف تكلفتك", onClick: focusCosts } : { label: "جرّب تاني", onClick: calculate }}>
            {error.message}
          </Notice>
        )}
        {suggestion && !busy && (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group flex min-h-14 w-full items-center gap-3 rounded-control border border-line bg-surface px-4 text-start transition-colors duration-quick hover:border-ink"
            >
              <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${CONFIDENCE[suggestion.confidence].ink}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-extrabold">السعر المقترح: {formatPrice(suggestion.suggestedPrice)}</span>
                <span className="text-meta text-ink-3">{CONFIDENCE[suggestion.confidence].label}</span>
              </span>
              <span className="text-meta font-bold text-ink-2">التفاصيل</span>
              <CaretLeft className="size-4 text-ink-2 transition-transform duration-quick group-hover:-translate-x-0.5" aria-hidden="true" />
            </button>
            {stale && (
              <Notice tone="info" icon={<ArrowsClockwise className="size-5 shrink-0" aria-hidden="true" />}>
                غيّرت بيانات القطعة بعد ما حسبنا. احسب تاني عشان السعر يبقى مظبوط.
              </Notice>
            )}
          </>
        )}
        {used &&
          (accept.isError ? (
            <Notice tone="warning" action={{ label: "جرّب تاني", onClick: () => suggestion && usedPrice !== null && record(suggestion, usedPrice) }}>
              السعر اتحط، بس معرفناش نسجّل اختيارك.
            </Notice>
          ) : (
            <p className="flex items-center gap-1.5 text-meta font-bold text-success">
              {accept.isPending ? <Spinner /> : <Check className="size-4" weight="bold" aria-hidden="true" />}
              حطّينا السعر المقترح في خانة السعر.
            </p>
          ))}
      </div>

      <Stitch />

      <fieldset className="flex flex-col gap-4" disabled={busy}>
        <legend className="mb-1 flex flex-col gap-0.5">
          <span className="text-body-sm font-extrabold text-ink">تكلفتك (اختياري)</span>
          <span className="text-meta text-ink-3">كل ما تكتب تكلفتك، السعر يبقى أدق ونحسبلك صافي ربحك.</span>
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField ref={materialsRef} id="cost-materials" label="الخامات (ج.م)" inputMode="decimal" dir="ltr" className="text-start" placeholder="مثلاً 120" {...costs.field("materials")} />
          <TextField id="cost-hours" label="ساعات الشغل" inputMode="decimal" dir="ltr" className="text-start" placeholder="مثلاً 3" {...costs.field("hours")} />
          <TextField id="cost-packaging" label="التغليف (ج.م)" inputMode="decimal" dir="ltr" className="text-start" placeholder="مثلاً 15" {...costs.field("packaging")} />
        </div>
      </fieldset>

      <Dialog open={open && suggestion !== null} onClose={() => setOpen(false)} title="السعر المقترح لقطعتك" size="lg">
        {suggestion && <PriceResult suggestion={suggestion} currentPrice={currentPrice} onUse={use} onClose={() => setOpen(false)} onAddCosts={focusCosts} />}
      </Dialog>
    </div>
  );
}

/** Only numbers that pass their check are sent; blank or invalid ones are left out, never guessed. */
function readCosts(values: Record<CostField, string>): PriceCosts | undefined {
  const read = (field: CostField) => (COST_CHECKS[field](values[field]) ? undefined : (parseNumber(values[field]) ?? undefined));
  const out: PriceCosts = { materialsCost: read("materials"), laborHours: read("hours"), packagingCost: read("packaging") };
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

function PriceResult({
  suggestion: s,
  currentPrice,
  onUse,
  onClose,
  onAddCosts,
}: {
  suggestion: PriceSuggestion;
  currentPrice: number | null;
  onUse: () => void;
  onClose: () => void;
  onAddCosts: () => void;
}) {
  const confidence = CONFIDENCE[s.confidence];
  const same = currentPrice !== null && Math.abs(currentPrice - s.suggestedPrice) < 0.005;
  const cost = s.cost;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-meta font-bold text-ink-2">السعر المقترح</span>
        <m.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-display font-extrabold tabular-nums text-ink"
        >
          {formatPrice(s.suggestedPrice)}
        </m.span>
        <span className="text-body-sm text-ink-2">
          النطاق المناسب: من {formatPrice(s.rangeMin)} لـ {formatPrice(s.rangeMax)}
        </span>
      </div>

      <RangeBar suggestion={s} currentPrice={currentPrice} />

      <div className="flex flex-col gap-2">
        <StatusTag tone={confidence.tone} className="w-fit">
          {confidence.label}
        </StatusTag>
        {s.confidenceLabel && <p className="text-body-sm text-ink-2">{s.confidenceLabel}</p>}
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="meter" aria-label="درجة الثقة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.confidenceScore * 100)}>
          <m.div
            className={`h-full rounded-full ${confidence.ink}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(4, s.confidenceScore * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {s.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {s.warnings.map((w) => (
            <Notice key={w.key + w.message} tone="warning" action={w.key === "NO_COST_INPUT" ? { label: "ضيف تكلفتك", onClick: onAddCosts } : undefined}>
              {w.message}
            </Notice>
          ))}
        </div>
      )}

      {s.netProfit !== null ? (
        <div className="flex flex-col gap-1 rounded-image bg-success-container/60 p-4">
          <span className="text-meta font-bold text-ink-2">صافي ربحك في القطعة</span>
          <span className={`text-headline font-extrabold tabular-nums ${s.netProfit < 0 ? "text-error" : "text-success"}`}>{formatPrice(s.netProfit)}</span>
          <span className="text-meta text-ink-2">بعد تكلفتك وعمولة المنصة ({percent(s.commissionPct)}).</span>
        </div>
      ) : (
        !s.warnings.some((w) => w.key === "NO_COST_INPUT") && (
          <Notice tone="info" action={{ label: "ضيف تكلفتك", onClick: onAddCosts }}>
            ضيف تكلفتك عشان نعرّفك صافي ربحك.
          </Notice>
        )
      )}

      {s.factors.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="ps-factors">
          <h3 id="ps-factors" className="text-body font-extrabold">
            ليه السعر ده؟
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {s.factors.map((f) => (
              <li key={f.key + f.label} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-body-sm text-ink">{f.label}</span>
                <span dir="ltr" className={`text-body-sm font-extrabold tabular-nums ${f.impactPct > 0 ? "text-success" : f.impactPct < 0 ? "text-error" : "text-ink-2"}`}>
                  {signedPercent(f.impactPct)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cost && cost.total !== null && (
          <Ledger title="تكلفتك">
            {cost.materials !== null && <Line label="الخامات" value={formatPrice(cost.materials)} />}
            {cost.labor !== null && cost.laborHours !== null && cost.hourlyRate !== null && (
              <Line label={`الشغل (${plain(cost.laborHours)} ساعة × ${formatPrice(cost.hourlyRate)})`} value={formatPrice(cost.labor)} />
            )}
            {cost.packaging !== null && <Line label="التغليف" value={formatPrice(cost.packaging)} />}
            {cost.overhead !== null && cost.overheadPct !== null && <Line label={`مصاريف تانية (${percent(cost.overheadPct)})`} value={formatPrice(cost.overhead)} />}
            <Line label="إجمالي التكلفة" value={formatPrice(cost.total)} strong />
            {s.floorPrice !== null && <Line label="أقل سعر يغطي تكلفتك" value={formatPrice(s.floorPrice)} />}
          </Ledger>
        )}
        <Ledger title="السوق" className={cost && cost.total !== null ? "" : "sm:col-span-2"}>
          {s.marketPrice !== null ? <Line label="سعر القطع المشابهة" value={formatPrice(s.marketPrice)} /> : <p className="text-body-sm text-ink-2">لسه مفيش قطع مشابهة كفاية نقارن بيها.</p>}
          {s.comparablesCount > 0 && (
            <p className="text-meta text-ink-3">
              قارنّا بـ {s.comparablesCount.toLocaleString("en-US")} قطعة، {s.soldComparablesCount.toLocaleString("en-US")} منها اتباعت فعلاً.
            </p>
          )}
        </Ledger>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 border-t border-line bg-surface p-5 sm:-mx-7 sm:-mb-7 sm:px-7">
        {same && <p className="text-meta text-ink-3">ده نفس سعرك الحالي.</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={onClose}>
            مش دلوقتي
          </Button>
          <Button onClick={onUse}>
            استخدم السعر ده ({formatPrice(s.suggestedPrice)})
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The range on a dashed thread: the fair range in orange, a knot at the suggested price and a tick
 * at the price typed now. Laid out with logical insets, so it reads from the start side in RTL.
 */
function RangeBar({ suggestion: s, currentPrice }: { suggestion: PriceSuggestion; currentPrice: number | null }) {
  const values = [s.rangeMin, s.rangeMax, s.suggestedPrice, ...(currentPrice !== null && currentPrice > 0 ? [currentPrice] : [])];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const low = Math.max(0, lo - pad);
  const span = hi + pad - low;
  const at = (v: number) => `${Math.min(100, Math.max(0, ((v - low) / span) * 100))}%`;
  const showCurrent = currentPrice !== null && currentPrice > 0;

  return (
    <div
      role="img"
      aria-label={`النطاق المناسب من ${formatPrice(s.rangeMin)} إلى ${formatPrice(s.rangeMax)}، والسعر المقترح ${formatPrice(s.suggestedPrice)}${showCurrent ? `، وسعرك دلوقتي ${formatPrice(currentPrice)}` : ""}`}
      className="flex flex-col gap-2"
    >
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-line-strong" />
        <m.div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
          style={{ insetInlineStart: at(s.rangeMin), width: `calc(${at(s.rangeMax)} - ${at(s.rangeMin)})` }}
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        {showCurrent && <div className="absolute top-1 bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink rtl:translate-x-1/2" style={{ insetInlineStart: at(currentPrice) }} />}
        <m.div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[4px] border-2 border-surface bg-secondary shadow-sm rtl:translate-x-1/2"
          style={{ insetInlineStart: at(s.suggestedPrice) }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.25 }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-meta tabular-nums text-ink-3">
        <span>{formatPrice(s.rangeMin)}</span>
        {showCurrent && <StatusMark tone="neutral">سعرك دلوقتي {formatPrice(currentPrice)}</StatusMark>}
        <span>{formatPrice(s.rangeMax)}</span>
      </div>
    </div>
  );
}

function Ledger({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-2 rounded-image border border-line bg-surface-raised p-4 ${className}`}>
      <h3 className="flex items-center gap-2 text-body font-extrabold">
        {title === "السوق" ? <ChartLineUp className="size-5 text-ink-2" aria-hidden="true" /> : <Coins className="size-5 text-ink-2" aria-hidden="true" />}
        {title}
      </h3>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </section>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-dashed border-line-strong pt-1.5" : ""}`}>
      <dt className={`text-body-sm ${strong ? "font-extrabold text-ink" : "text-ink-2"}`}>{label}</dt>
      <dd className={`text-body-sm tabular-nums ${strong ? "font-extrabold text-ink" : "font-bold text-ink"}`}>{value}</dd>
    </div>
  );
}

const NOTICE: Record<"info" | "warning" | "danger", string> = {
  info: "bg-info-container text-info",
  warning: "bg-warning-container text-warning",
  danger: "bg-error-container text-error",
};

function Notice({
  tone,
  children,
  action,
  icon,
}: {
  tone: "info" | "warning" | "danger";
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}) {
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={`flex items-start gap-3 rounded-control p-3.5 ${NOTICE[tone]}`}>
      {icon ?? <Warning className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
      <p className="flex-1 text-body-sm font-semibold text-ink">{children}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="-my-1 min-h-9 shrink-0 rounded-full px-3 text-body-sm font-extrabold underline-offset-4 hover:underline">
          {action.label}
        </button>
      )}
    </div>
  );
}
