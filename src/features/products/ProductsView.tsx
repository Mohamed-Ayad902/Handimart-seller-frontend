"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { ImageBroken, MagnifyingGlass, Minus, PencilSimple, Plus, RocketLaunch, X } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag } from "@/components/ui/StatusTag";
import { useToast } from "@/components/ui/Toast";
import { formatCount, formatDuration, formatPrice } from "@/lib/format";
import { ApiError } from "@/lib/client/api";
import type { Product } from "@/lib/types";
import { useMyProducts, useUpdateStock } from "./api";
import { TABS, cover, inTab, productState, type TabKey } from "./labels";

const EMPTY: Record<TabKey, { title: string; body: string }> = {
  all: { title: "لسه مفيش قطع في معرضك", body: "ضيف أول قطعة بصور واضحة وحكاية قصيرة، وهتتراجع قبل ما تظهر للعملاء." },
  active: { title: "مفيش قطع معروضة دلوقتي", body: "القطع اللي بتتقبل وبتفعّلها بتظهر هنا وللعملاء." },
  review: { title: "مفيش قطع بتتراجع", body: "أي قطعة جديدة أو متعدلة بتستنى هنا لحد ما الفريق يراجعها." },
  inactive: { title: "مفيش قطع متوقفة", body: "لما توقف قطعة مؤقتاً بتختفي من المتجر وتلاقيها هنا." },
};

export function ProductsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "all") as TabKey;
  const [query, setQuery] = useState("");
  const products = useMyProducts();

  const all = useMemo(() => products.data?.pages.flatMap((p) => p.content) ?? [], [products.data]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, all.filter((p) => inTab(p, t.key)).length])) as Record<TabKey, number>, [all]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((p) => inTab(p, tab) && (!q || p.name.toLowerCase().includes(q)));
  const total = products.data?.pages[0]?.totalElements ?? 0;

  const selectTab = (key: TabKey) => router.replace(key === "all" ? pathname : `${pathname}?tab=${key}`, { scroll: false });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="enter text-meta font-bold text-accent-text">معرضك</p>
          <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
            المنتجات
          </h1>
        </div>
        <ButtonLink href="/products/new" className="enter" style={{ "--i": 2 } as React.CSSProperties}>
          <Plus className="size-5" aria-hidden="true" />
          قطعة جديدة
        </ButtonLink>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
          <div role="tablist" aria-label="حالة القطع" className="flex w-max gap-1 border-b border-divider">
            {TABS.map((t) => {
              const selected = t.key === tab;
              return (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => selectTab(t.key)}
                  className={`relative flex min-h-11 items-center gap-1.5 px-3.5 text-body-sm whitespace-nowrap transition-colors duration-quick ${selected ? "font-extrabold text-ink" : "font-semibold text-ink-2 hover:text-ink"}`}
                >
                  {t.label}
                  {products.isSuccess && <span className="rounded-full bg-surface-sunken px-1.5 text-meta tabular-nums text-ink-2">{formatCount(counts[t.key])}</span>}
                  {selected && <m.span layoutId="products-tab" aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                </button>
              );
            })}
          </div>
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">دوّر في منتجاتك</span>
          <MagnifyingGlass className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="دوّر في منتجاتك"
            className="h-12 w-full rounded-full border border-line-strong bg-surface ps-11 pe-10 text-body placeholder:text-ink-3 focus:border-ink"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="امسح البحث" className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      {products.isPending ? (
        <GridSkeleton />
      ) : products.isError ? (
        <StateView
          illustration="tangledThread"
          title="معرفناش نجيب منتجاتك"
          body="حصلت مشكلة وإحنا بنجيب القطع. تقدر تحاول مرة تاني؟"
          action={
            <Button onClick={() => products.refetch()} disabled={products.isFetching}>
              حاول مرة أخرى
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        q ? (
          <StateView illustration="threadSearch" title={`مفيش قطعة باسم «${query.trim()}»`} body={products.hasNextPage ? "بندوّر في القطع اللي اتحملت بس. حمّل الباقي وجرّب تاني." : "جرّب كلمة تانية من اسم القطعة."} />
        ) : (
          <StateView illustration="emptySpool" title={EMPTY[tab].title} body={EMPTY[tab].body} action={tab === "all" ? <ButtonLink href="/products/new">ضيف أول قطعة</ButtonLink> : undefined} />
        )
      ) : (
        <>
          <p className="text-meta text-ink-3" aria-live="polite">
            {formatCount(shown.length)} من {formatCount(total)} قطعة
          </p>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </ul>
        </>
      )}

      {products.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="quiet" onClick={() => products.fetchNextPage()} disabled={products.isFetchingNextPage}>
            {products.isFetchingNextPage ? <Spinner /> : null}
            حمّل قطع تانية
          </Button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p, index }: { product: Product; index: number }) {
  const state = productState(p);
  const images = p.media.filter((x) => x.type === "IMAGE" && x.url);
  const first = cover(p);
  const second = images[1]?.url ?? null;
  const discounted = p.currentPrice < p.basePrice;

  return (
    <m.li
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(index % 8, 6) * 0.05 }}
      className="group relative flex flex-col overflow-hidden rounded-image-lg border border-line bg-surface transition-[box-shadow,border-color,translate] duration-standard ease-soft hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgb(42_19_48/0.35)]"
    >
      <Link href={`/products/${p.id}`} className="absolute inset-0 z-10 rounded-image-lg focus-visible:outline-offset-[-3px]" aria-label={`${p.name}، ${state.label}`} />
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        {first ? (
          <>
            <Image src={first} alt="" fill sizes="(min-width: 1536px) 22rem, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover transition-[transform,opacity] duration-[700ms] ease-soft group-hover:scale-[1.04]" />
            {second && (
              <Image src={second} alt="" fill sizes="(min-width: 1024px) 30vw, 45vw" className="object-cover opacity-0 transition-opacity duration-[600ms] ease-soft group-hover:opacity-100 motion-reduce:hidden" />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-ink-3">
            <ImageBroken className="size-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <StatusTag tone={state.tone} className="shadow-sm">
            {state.label}
          </StatusTag>
          {p.boosted && (
            <span className="inline-flex items-center gap-1 rounded-tag bg-secondary px-2 py-0.5 text-meta font-bold text-on-secondary">
              <RocketLaunch className="size-3.5" aria-hidden="true" />
              مُروَّج
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-subtitle font-extrabold">{p.name}</h2>
          <p className="truncate text-meta text-ink-3">{p.categoryName ?? "بدون قسم"}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-title font-extrabold tabular-nums">{formatPrice(p.currentPrice)}</span>
          {discounted && <span className="text-body-sm text-ink-3 line-through tabular-nums">{formatPrice(p.basePrice)}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line pt-3">
          {p.productType === "READY_MADE" ? (
            <StockStepper product={p} />
          ) : (
            <span className="text-body-sm text-ink-2">
              وقت التجهيز <b className="text-ink">{formatDuration(p.estimatedDeliveryTimeMinutes ?? 0)}</b>
            </span>
          )}
          <Link
            href={`/products/${p.id}/edit`}
            className="relative z-20 grid size-10 place-items-center rounded-full text-ink-2 transition-colors duration-quick hover:bg-surface-sunken hover:text-ink"
            aria-label={`عدّل ${p.name}`}
          >
            <PencilSimple className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </m.li>
  );
}

/** Quick stock change on the card: no review round, sent once the seller stops tapping. */
function StockStepper({ product: p }: { product: Product }) {
  const toast = useToast();
  const update = useUpdateStock();
  const saved = p.stockQuantity ?? 0;
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? saved;

  const commit = (next: number) => {
    if (next === saved) return setDraft(null);
    update.mutate(
      { id: p.id, stock: next },
      {
        onSuccess: () => {
          setDraft(null);
          toast.show(next === 0 ? `«${p.name}» بقت خلصانة` : `اتحدثت الكمية: ${formatCount(next)}`);
        },
        onError: (e) => {
          setDraft(null);
          toast.show(e instanceof ApiError ? e.message : "معرفناش نحدّث الكمية.", { tone: "error" });
        },
      },
    );
  };

  const step = (delta: number) => setDraft(Math.max(0, Math.min(99_999, value + delta)));

  return (
    <div className="relative z-20 flex items-center gap-1" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && draft !== null && commit(draft)}>
      <span className="me-1 text-body-sm text-ink-2">متاح</span>
      <button type="button" onClick={() => step(-1)} disabled={value <= 0 || update.isPending} aria-label="قلّل الكمية" className="grid size-8 place-items-center rounded-full border border-line-strong text-ink hover:border-ink disabled:opacity-40">
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" className={`min-w-8 text-center text-body font-extrabold tabular-nums ${value === 0 ? "text-warning" : ""}`}>
        {update.isPending ? <Spinner className="mx-auto size-4" /> : formatCount(value)}
      </output>
      <button type="button" onClick={() => step(1)} disabled={update.isPending} aria-label="زوّد الكمية" className="grid size-8 place-items-center rounded-full border border-line-strong text-ink hover:border-ink disabled:opacity-40">
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
      {draft !== null && draft !== saved && !update.isPending && (
        <button type="button" onClick={() => commit(draft)} className="ms-1 rounded-full bg-ink px-2.5 py-1 text-meta font-bold text-paper">
          احفظ
        </button>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="بنحمّل منتجاتك">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-image-lg border border-line bg-surface">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-6 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
