"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { m } from "motion/react";
import { ChatsCircle, Check, Megaphone, MagnifyingGlass, RocketLaunch, Storefront, Tag, Wallet } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { BoostCampaign, BoostPaymentMethod, BoostPlan, BoostTargetType, Product } from "@/lib/types";
import { useWallet } from "@/features/home/api";
import { cover } from "@/features/products/labels";
import { useBoostCampaigns, useBoostPlans, useBoostableProducts, usePurchaseBoost } from "./api";

const ID = /^[0-9a-fA-F-]{36}$/;

const TARGETS: { type: BoostTargetType; title: string; body: string; icon: Icon }[] = [
  { type: "STORE_BANNER", title: "روّج متجرك", body: "بانر متجرك في الرئيسية قدام كل العملا.", icon: Storefront },
  { type: "PRODUCT_SEARCH", title: "روّج قطعة", body: "قطعتك تظهر في أول نتايج البحث.", icon: MagnifyingGlass },
];

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { label: "مستني الدفع", tone: "action" },
  ACTIVE: { label: "شغّال", tone: "success" },
  COMPLETED: { label: "انتهى", tone: "neutral" },
  CANCELLED_BY_ADMIN: { label: "اتلغى", tone: "danger" },
};

const PAID_WITH: Record<string, string> = {
  WALLET: "من المحفظة",
  MANUAL_INSTAPAY: "تحويل إنستاباي",
  REWARD_CREDIT: "مكافأة مجانية",
};

const days = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوم`);

export function BoostView() {
  const params = useSearchParams();
  const preset = params.get("product");
  const [target, setTarget] = useState<BoostTargetType>(preset && ID.test(preset) ? "PRODUCT_SEARCH" : "STORE_BANNER");
  const [productId, setProductId] = useState<string | null>(preset && ID.test(preset) ? preset : null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const plans = useBoostPlans(target);
  const products = useBoostableProducts(target === "PRODUCT_SEARCH");
  const plan = plans.data?.find((p) => p.id === planId) ?? null;
  const product = products.data?.find((p) => p.id === productId) ?? null;
  const ready = !!plan && (target === "STORE_BANNER" || !!product);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="enter text-meta font-bold text-accent-text">خليها تتشاف</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          روّج متجرك أو قطعك
        </h1>
        <p className="enter mt-1 max-w-[60ch] text-body-sm text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>
          الترويج بيوصّل شغلك لعملا أكتر بسرعة: بانر لمتجرك في الرئيسية، أو قطعتك في أول البحث، للمدة اللي تختارها.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <section aria-labelledby="boost-target">
            <h2 id="boost-target" className="mb-3 text-title font-extrabold">
              حابب تروّج لإيه؟
            </h2>
            <div role="radiogroup" aria-labelledby="boost-target" className="grid gap-3 sm:grid-cols-2">
              {TARGETS.map((t) => {
                const on = target === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      if (on) return;
                      setTarget(t.type);
                      setPlanId(null);
                    }}
                    className={`group relative flex items-start gap-4 overflow-hidden rounded-image border-[1.5px] p-5 text-start transition-[border-color,background-color,transform] duration-standard ease-soft hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${on ? "border-secondary bg-secondary text-on-secondary" : "border-line bg-surface hover:border-ink"}`}
                  >
                    <span className={`grid size-12 shrink-0 place-items-center rounded-full ${on ? "bg-on-secondary/15" : "bg-surface-sunken"}`}>
                      <t.icon className="size-6" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-subtitle font-extrabold">{t.title}</span>
                      <span className={`mt-0.5 block text-body-sm ${on ? "opacity-85" : "text-ink-2"}`}>{t.body}</span>
                    </span>
                    {on && <Check className="absolute top-4 end-4 size-5" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>

          {target === "PRODUCT_SEARCH" && <ProductChoice products={products} selected={productId} onSelect={setProductId} />}

          <section aria-labelledby="boost-plans">
            <h2 id="boost-plans" className="mb-3 text-title font-extrabold">
              اختار المدة
            </h2>
            {plans.isPending ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : plans.isError ? (
              <SectionError message="معرفناش نجيب الباقات." />
            ) : !plans.data.length ? (
              <p className="rounded-image bg-surface p-6 text-center text-body-sm text-ink-2">مفيش باقات متاحة دلوقتي. جرّب تاني بعدين.</p>
            ) : (
              <div role="radiogroup" aria-labelledby="boost-plans" className="grid gap-3 sm:grid-cols-3">
                {plans.data.map((p) => (
                  <PlanCard key={p.id} plan={p} on={p.id === planId} onPick={() => setPlanId(p.id)} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-4 rounded-image-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
            <h2 className="text-subtitle font-extrabold">ملخص الترويج</h2>
            <dl className="flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">النوع</dt>
                <dd className="font-bold">{target === "STORE_BANNER" ? "بانر المتجر" : "أول البحث"}</dd>
              </div>
              {target === "PRODUCT_SEARCH" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">القطعة</dt>
                  <dd className="truncate font-bold">{product?.name ?? "—"}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">المدة</dt>
                <dd className="font-bold">{plan ? days(plan.durationDays) : "—"}</dd>
              </div>
              <div className="stitch my-1 opacity-60" aria-hidden="true" />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-2">الإجمالي</dt>
                <dd className="text-title font-extrabold tabular-nums">{plan ? formatPrice(plan.price) : "—"}</dd>
              </div>
            </dl>
            <Button onClick={() => setPaying(true)} disabled={!ready}>
              <RocketLaunch className="size-5" aria-hidden="true" />
              روّج دلوقتي
            </Button>
            {!ready && <p className="text-meta text-ink-3">{!plan ? "اختار مدة الأول." : "اختار القطعة اللي عايز تروّجها."}</p>}
          </div>
        </aside>
      </div>

      <History />

      {paying && plan && <PayDialog plan={plan} target={target} product={product} onClose={() => setPaying(false)} onDone={() => setPlanId(null)} />}
    </div>
  );
}

function PlanCard({ plan: p, on, onPick }: { plan: BoostPlan; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`relative flex flex-col items-start gap-1 rounded-image border-[1.5px] p-5 text-start transition-[border-color,transform,box-shadow] duration-standard ease-soft hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(42_19_48/0.55)] motion-reduce:hover:translate-y-0 ${on ? "border-secondary bg-surface" : "border-line bg-surface hover:border-ink"}`}
    >
      {on && <m.span layoutId="boost-plan" aria-hidden="true" className="absolute inset-0 rounded-image ring-2 ring-secondary ring-offset-2 ring-offset-paper" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
      <span className="text-meta font-bold text-accent-text">{p.name}</span>
      <span className="text-title font-extrabold">{days(p.durationDays)}</span>
      <span className="mt-2 text-subtitle font-extrabold tabular-nums">{formatPrice(p.price)}</span>
      {p.durationDays > 1 && <span className="text-meta text-ink-3 tabular-nums">{formatPrice(Math.round((p.price / p.durationDays) * 100) / 100)} في اليوم</span>}
    </button>
  );
}

function ProductChoice({ products, selected, onSelect }: { products: ReturnType<typeof useBoostableProducts>; selected: string | null; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = (products.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  return (
    <section aria-labelledby="boost-piece">
      <h2 id="boost-piece" className="mb-3 text-title font-extrabold">
        أنهي قطعة؟
      </h2>
      <div className="relative mb-3">
        <MagnifyingGlass className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <label htmlFor="boost-search" className="sr-only">
          دوّر على قطعة
        </label>
        <input id="boost-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="دوّر على قطعة" className="h-11 w-full rounded-control border border-line-strong bg-surface ps-9 pe-3 text-body-sm focus:border-ink" />
      </div>
      {products.isPending ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : products.isError ? (
        <SectionError message="معرفناش نجيب قطعك." />
      ) : !products.data.length ? (
        <p className="rounded-image bg-surface p-6 text-center text-body-sm text-ink-2">معندكش قطع متوافق عليها لسه. أول ما قطعة تتنشر تقدر تروّجها.</p>
      ) : (
        <div role="radiogroup" aria-labelledby="boost-piece" className="grid max-h-80 gap-2 overflow-y-auto overscroll-contain p-0.5 sm:grid-cols-2" data-lenis-prevent="">
          {list.map((p) => (
            <PieceOption key={p.id} product={p} on={p.id === selected} onPick={() => onSelect(p.id)} />
          ))}
          {!list.length && <p className="p-4 text-body-sm text-ink-2">مفيش قطع بالاسم ده.</p>}
        </div>
      )}
    </section>
  );
}

function PieceOption({ product: p, on, onPick }: { product: Product; on: boolean; onPick: () => void }) {
  const img = cover(p);
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onPick} className={`flex items-center gap-3 rounded-image border-[1.5px] p-2.5 text-start transition-colors duration-quick ${on ? "border-secondary bg-secondary-container/40" : "border-line bg-surface hover:border-ink"}`}>
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-surface-sunken">{img ? <Image src={img} alt="" fill sizes="48px" className="object-cover" /> : <Tag className="size-5 text-ink-3" aria-hidden="true" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-bold">{p.name}</span>
        <span className="text-meta text-ink-3 tabular-nums">{formatPrice(p.currentPrice)}</span>
        {p.boosted && <span className="ms-2 text-meta font-bold text-accent-text">مُروَّجة دلوقتي</span>}
      </span>
      {on && <Check className="size-5 shrink-0 text-secondary" aria-hidden="true" />}
    </button>
  );
}

function PayDialog({ plan, target, product, onClose, onDone }: { plan: BoostPlan; target: BoostTargetType; product: Product | null; onClose: () => void; onDone: () => void }) {
  const wallet = useWallet();
  const buy = usePurchaseBoost();
  const toast = useToast();
  const router = useRouter();
  const balance = wallet.data?.availableBalance ?? 0;
  const covers = !!wallet.data && balance >= plan.price;
  const [method, setMethod] = useState<BoostPaymentMethod | null>(null);
  const chosen = method ?? (wallet.isPending ? null : covers ? "WALLET" : "MANUAL_INSTAPAY");

  const confirm = () => {
    if (!chosen || buy.isPending || (chosen === "WALLET" && !covers)) return;
    buy.mutate(
      { planId: plan.id, targetType: target, targetRefId: target === "PRODUCT_SEARCH" ? (product?.id ?? null) : null, preferredPaymentMethod: chosen },
      {
        onSuccess: (c) => {
          onDone();
          onClose();
          if (c.paymentMethod === "WALLET") toast.show("الترويج اتفعّل. بالتوفيق!");
          else if (c.supportConversationId) {
            toast.show("فتحنالك محادثة مع الدعم. ابعت فيها إيصال التحويل.");
            router.push(`/support/${c.supportConversationId}`);
          } else toast.show("طلب الترويج اتبعت.");
        },
      },
    );
  };

  return (
    <Dialog open onClose={() => !buy.isPending && onClose()} title="اختار طريقة الدفع" locked={buy.isPending}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">
          {plan.name} · {days(plan.durationDays)}
          {product ? ` · ${product.name}` : ""} بـ <strong className="text-ink tabular-nums">{formatPrice(plan.price)}</strong>
        </p>
        {wallet.isPending ? (
          <Skeleton className="h-36" />
        ) : (
          <div role="radiogroup" aria-label="طريقة الدفع" className="flex flex-col gap-2">
            <PayOption chosen={chosen} busy={buy.isPending} onPick={setMethod} value="WALLET" icon={Wallet} title="من المحفظة" body={covers ? `هيتخصم ${formatPrice(plan.price)} من رصيدك فوراً (رصيدك ${formatPrice(balance)}).` : `رصيدك ${formatPrice(balance)} مش كفاية.`} disabled={!covers} />
            <PayOption chosen={chosen} busy={buy.isPending} onPick={setMethod} value="MANUAL_INSTAPAY" icon={ChatsCircle} title="تحويل إنستاباي" body="هنفتحلك محادثة مع الدعم تبعت فيها إيصال التحويل، والترويج يشتغل أول ما يتأكد." />
          </div>
        )}
        {buy.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {buy.error instanceof ApiError ? buy.error.message : "معرفناش نكمّل. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={onClose} disabled={buy.isPending}>
            رجوع
          </Button>
          <Button onClick={confirm} disabled={!chosen || buy.isPending} aria-busy={buy.isPending}>
            {buy.isPending && <Spinner />}
            {chosen === "MANUAL_INSTAPAY" ? "افتح محادثة الدفع" : "أكّد وادفع"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PayOption({ value, icon: I, title, body, disabled, chosen, busy, onPick }: { value: BoostPaymentMethod; icon: Icon; title: string; body: string; disabled?: boolean; chosen: BoostPaymentMethod | null; busy: boolean; onPick: (m: BoostPaymentMethod) => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen === value}
      disabled={disabled || busy}
      onClick={() => onPick(value)}
      className={`flex items-start gap-3 rounded-image border-[1.5px] p-4 text-start transition-colors duration-quick disabled:opacity-50 ${chosen === value ? "border-secondary bg-secondary-container/40" : "border-line hover:border-ink"}`}
    >
      <I className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-subtitle font-extrabold">{title}</span>
        <span className="block text-body-sm text-ink-2">{body}</span>
      </span>
      {chosen === value && <Check className="size-5 shrink-0 text-secondary" aria-hidden="true" />}
    </button>
  );
}

function History() {
  const list = useBoostCampaigns();
  const items = list.data?.pages.flatMap((p) => p.content) ?? [];
  return (
    <section aria-labelledby="boost-history">
      <p className="text-meta font-bold text-accent-text">اللي روّجته قبل كده</p>
      <h2 id="boost-history" className="mb-4 text-title font-extrabold">
        سجل الترويج
      </h2>
      {list.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : list.isError ? (
        <SectionError message="معرفناش نجيب سجل الترويج." />
      ) : !items.length ? (
        <div className="flex flex-col items-center gap-2 rounded-image bg-surface p-8 text-center">
          <Megaphone className="size-10 text-ink-3" aria-hidden="true" />
          <p className="text-subtitle font-bold">لسه مفيش حملات ترويج</p>
          <p className="text-body-sm text-ink-2">أول ترويج تعمله هيظهر هنا.</p>
        </div>
      ) : (
        <>
          <ul className="overflow-hidden rounded-image border border-line bg-surface">
            {items.map((c) => (
              <li key={c.id} className="border-b border-dashed border-line last:border-0">
                <CampaignRow campaign={c} />
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button variant="quiet" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage && <Spinner />}
                اعرض أقدم
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CampaignRow({ campaign: c }: { campaign: BoostCampaign }) {
  const s = STATUS[c.status] ?? { label: c.status, tone: "neutral" as StatusTone };
  const I = c.targetType === "STORE_BANNER" ? Storefront : MagnifyingGlass;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-sunken">
        <I className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-extrabold">{c.targetLabel || (c.targetType === "STORE_BANNER" ? "بانر المتجر" : "قطعة في البحث")}</p>
        <p className="text-meta text-ink-2">
          {[c.planName, days(c.durationDaysSnapshot), PAID_WITH[c.paymentMethod]].filter(Boolean).join(" · ")}
          {c.startTime && c.endTime ? ` · من ${formatDate(c.startTime)} لـ ${formatDate(c.endTime)}` : ` · اتطلب ${formatDate(c.createdAt)}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-body-sm font-bold tabular-nums">{c.paymentMethod === "REWARD_CREDIT" ? "مجاناً" : formatPrice(c.priceSnapshot)}</span>
        <StatusTag tone={s.tone}>{s.label}</StatusTag>
      </div>
      {c.status === "PENDING_PAYMENT" && c.supportConversationId && (
        <Link href={`/support/${c.supportConversationId}`} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control border border-line-strong text-meta font-bold hover:border-ink sm:w-auto sm:px-4">
          <ChatsCircle className="size-4" aria-hidden="true" />
          كمّل الدفع في محادثة الدعم
        </Link>
      )}
    </div>
  );
}
