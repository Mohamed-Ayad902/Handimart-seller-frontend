"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Eye, EyeSlash, ImageBroken, PencilSimple, Play, WarningOctagon } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag } from "@/components/ui/StatusTag";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatCount, formatDate, formatDuration, formatPrice, formatRating } from "@/lib/format";
import type { Product, ProductMedia } from "@/lib/types";
import { useProduct, useSetActive } from "./api";
import { FLAG, REJECTION, TYPE, productState } from "./labels";

export function ProductDetail({ id }: { id: string }) {
  const { product, isPending, isError, notFound, refetch } = useProduct(id);

  if (isPending) return <DetailSkeleton />;
  if (isError)
    return (
      <StateView
        illustration="tangledThread"
        title="معرفناش نجيب القطعة"
        body="حصلت مشكلة وإحنا بنجيب بياناتها. تقدر تحاول مرة تاني؟"
        action={<Button onClick={() => refetch()}>حاول مرة أخرى</Button>}
      />
    );
  if (notFound || !product)
    return <StateView illustration="cutThread" title="القطعة دي مش موجودة" body="ممكن تكون اتشالت، أو الرابط غلط." action={<ButtonLink href="/products">ارجع للمنتجات</ButtonLink>} />;

  return <Detail product={product} />;
}

function Detail({ product: p }: { product: Product }) {
  const state = productState(p);
  const discounted = p.currentPrice < p.basePrice;

  return (
    <article className="flex flex-col gap-8">
      <Link href="/products" className="group inline-flex w-fit min-h-11 items-center gap-1.5 text-body-sm font-bold text-ink-2 hover:text-ink">
        <ArrowRight className="size-4 transition-transform duration-standard ease-soft group-hover:translate-x-1" aria-hidden="true" />
        المنتجات
      </Link>

      {p.approvalStatus === "REJECTED" && <RejectionBanner product={p} />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <Gallery media={p.media} name={p.name} />

        <div className="flex flex-col gap-6 lg:col-span-5">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag tone={state.tone}>{state.label}</StatusTag>
              <span className="text-meta text-ink-3">{p.categoryName}</span>
            </div>
            <h1 className="text-headline font-extrabold text-balance">{p.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="text-display font-extrabold tabular-nums">{formatPrice(p.currentPrice)}</span>
              {discounted && <span className="text-subtitle text-ink-3 line-through tabular-nums">{formatPrice(p.basePrice)}</span>}
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-image border border-line bg-line">
            <Fact label={p.productType === "READY_MADE" ? "متاح" : "وقت التجهيز"} value={p.productType === "READY_MADE" ? formatCount(p.stockQuantity ?? 0) : formatDuration(p.estimatedDeliveryTimeMinutes ?? 0)} />
            <Fact label="اتباع" value={formatCount(p.totalSold ?? 0)} />
            <Fact label="التقييم" value={p.totalReviews ? `${formatRating(p.averageRating ?? 0)} (${formatCount(p.totalReviews)})` : "لسه"} />
            <Fact label="النوع" value={TYPE[p.productType].label} />
          </dl>
          {!!p.totalReviews && (
            <Link href={`/reviews?product=${p.id}`} className="-mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-body-sm font-bold hover:text-accent-text">
              رُد على تقييمات القطعة
            </Link>
          )}

          <Actions product={p} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <section aria-labelledby="about" className="lg:col-span-7">
          <h2 id="about" className="mb-3 text-title font-extrabold">
            عن القطعة
          </h2>
          <p className="max-w-[65ch] text-body leading-loose whitespace-pre-line text-ink-2">{p.description}</p>
        </section>

        <div className="flex flex-col gap-8 lg:col-span-5">
          <section aria-labelledby="details">
            <h2 id="details" className="mb-3 text-title font-extrabold">
              التفاصيل
            </h2>
            <dl className="divide-y divide-dashed divide-line rounded-image border border-line bg-surface px-4">
              <Row label="الوزن" value={p.dimensions?.weightKg != null ? `${p.dimensions.weightKg.toLocaleString("ar-EG")} كجم` : "—"} />
              <Row
                label="المقاس (طول × عرض × ارتفاع)"
                value={p.dimensions ? [p.dimensions.lengthCm, p.dimensions.widthCm, p.dimensions.heightCm].map((n) => (n ?? 0).toLocaleString("ar-EG")).join(" × ") + " سم" : "—"}
              />
              <Row label="اتضافت" value={formatDate(p.createdAt)} />
            </dl>
          </section>

          {(p.shippingFlags?.length ?? 0) > 0 && (
            <section aria-labelledby="shipping">
              <h2 id="shipping" className="mb-3 text-title font-extrabold">
                ملاحظات الشحن
              </h2>
              <ul className="flex flex-wrap gap-2">
                {p.shippingFlags!.map((f) => (
                  <li key={f}>
                    <StatusTag tone={FLAG[f].tone}>{FLAG[f].label}</StatusTag>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(p.customizations?.length ?? 0) > 0 && (
            <section aria-labelledby="options">
              <h2 id="options" className="mb-3 text-title font-extrabold">
                خيارات العميل
              </h2>
              <ul className="flex flex-col gap-3">
                {p.customizations!.map((c) => (
                  <li key={c.id ?? c.label} className="rounded-image border border-line bg-surface p-4">
                    <p className="mb-2 flex items-center gap-2 text-body font-bold">
                      {c.label}
                      {c.required && <span className="text-meta font-semibold text-accent-text">إجباري</span>}
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {c.values.map((v) => (
                        <li key={v.id ?? v.value} className="rounded-full border border-line-strong px-3 py-1 text-body-sm">
                          {v.value}
                          {v.additionalPrice ? <span className="ms-1.5 text-ink-3 tabular-nums">+{formatPrice(v.additionalPrice)}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(p.priceHistory?.length ?? 0) > 0 && (
            <section aria-labelledby="prices">
              <h2 id="prices" className="mb-3 text-title font-extrabold">
                السعر اتغيّر
              </h2>
              <ol className="flex flex-col gap-2">
                {p.priceHistory!.slice(0, 5).map((h) => (
                  <li key={h.changedAt} className="flex items-center justify-between gap-3 text-body-sm">
                    <span className="text-ink-3">{formatDate(h.changedAt)}</span>
                    <span className="tabular-nums">
                      <span className="text-ink-3 line-through">{formatPrice(h.oldPrice)}</span> ← <b>{formatPrice(h.newPrice)}</b>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

function RejectionBanner({ product: p }: { product: Product }) {
  return (
    <section aria-labelledby="rejected" className="relative overflow-hidden rounded-image-lg border border-error/30 bg-error-container p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <WarningOctagon className="size-7 shrink-0 text-error" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-meta font-bold text-error">رجعتلك بملاحظات</p>
          <h2 id="rejected" className="mt-1 text-subtitle font-extrabold text-ink">
            {p.rejectionReason ? REJECTION[p.rejectionReason] : REJECTION.OTHER}
          </h2>
          {p.reviewComment && (
            <p className="mt-2 text-body text-ink-2">
              <b className="text-ink">ملاحظة الفريق:</b> {p.reviewComment}
            </p>
          )}
        </div>
        <ButtonLink href={`/products/${p.id}/edit`} variant="secondary" className="shrink-0">
          <PencilSimple className="size-5" aria-hidden="true" />
          عدّل وابعتها تاني
        </ButtonLink>
      </div>
    </section>
  );
}

function Gallery({ media, name }: { media: ProductMedia[]; name: string }) {
  const items = media.filter((x) => x.url && x.type !== "UNKNOWN");
  const [index, setIndex] = useState(0);
  const current = items[Math.min(index, items.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:col-span-7">
      <div className="relative aspect-[4/3] overflow-hidden rounded-image-lg bg-surface-sunken">
        {current ? (
          <AnimatePresence mode="popLayout" initial={false}>
            <m.div key={current.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {current.type === "VIDEO" ? (
                <video src={current.url!} controls playsInline preload="metadata" className="size-full bg-black object-contain" aria-label={`فيديو ${name}`} />
              ) : (
                <Image src={current.url!} alt={name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              )}
            </m.div>
          </AnimatePresence>
        ) : (
          <div className="grid h-full place-items-center text-ink-3">
            <ImageBroken className="size-12" aria-hidden="true" />
          </div>
        )}
      </div>
      {items.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="صور القطعة">
          {items.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${item.type === "VIDEO" ? "فيديو" : "صورة"} ${i + 1}`}
                aria-current={i === index}
                className={`relative block size-18 overflow-hidden rounded-control border-2 transition-[border-color,opacity] duration-quick ${i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                {item.type === "VIDEO" ? (
                  <span className="grid size-full place-items-center bg-secondary text-on-secondary">
                    <Play className="size-6" weight="fill" aria-hidden="true" />
                  </span>
                ) : (
                  <Image src={item.url!} alt="" fill sizes="72px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Actions({ product: p }: { product: Product }) {
  const toast = useToast();
  const setActive = useSetActive();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approved = p.approvalStatus === "APPROVED";

  const run = () => {
    setError(null);
    setActive.mutate(
      { id: p.id, active: !p.active },
      {
        onSuccess: () => {
          setConfirm(false);
          toast.show(p.active ? "القطعة اتوقفت واختفت من المتجر" : "القطعة رجعت تتعرض للعملاء");
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "معرفناش نغيّر حالة القطعة."),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/products/${p.id}/edit`} variant={approved ? "quiet" : "primary"}>
          <PencilSimple className="size-5" aria-hidden="true" />
          عدّل القطعة
        </ButtonLink>
        {approved && (
          <Button variant={p.active ? "danger" : "primary"} onClick={() => setConfirm(true)}>
            {p.active ? <EyeSlash className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
            {p.active ? "وقّفها مؤقتاً" : "اعرضها تاني"}
          </Button>
        )}
      </div>
      <p className="text-meta text-ink-3">{approved ? "أي تعديل بيرجّع القطعة للمراجعة قبل ما تظهر تاني." : "القطعة بتظهر للعملاء بعد ما الفريق يراجعها."}</p>

      <ConfirmDialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
          setError(null);
        }}
        onConfirm={run}
        busy={setActive.isPending}
        destructive={p.active}
        title={p.active ? "توقف القطعة مؤقتاً؟" : "تعرض القطعة تاني؟"}
        body={p.active ? "هتختفي من البحث ومن متجرك لحد ما ترجّعها. مش هتتمسح، والطلبات اللي اتعملت قبل كده ماشية عادي." : "هترجع تظهر للعملاء في البحث وفي متجرك على طول."}
        confirmLabel={p.active ? "وقّفها" : "اعرضها"}
      >
        {error && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="mt-1 text-subtitle font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-body-sm text-ink-2">{label}</dt>
      <dd className="text-body-sm font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" aria-busy="true" aria-label="بنحمّل القطعة">
      <Skeleton className="aspect-[4/3] rounded-image-lg lg:col-span-7" />
      <div className="flex flex-col gap-4 lg:col-span-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
