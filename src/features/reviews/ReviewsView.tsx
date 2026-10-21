"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { m } from "motion/react";
import { ChatCircleText, Flag, PencilSimple, Images, SealCheck, Star, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextArea } from "@/components/ui/Field";
import { Pager } from "@/components/ui/Pager";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import { CountUp } from "@/components/motion/CountUp";
import { ApiError } from "@/lib/client/api";
import { formatAgo, formatCount, formatRating } from "@/lib/format";
import type { Review, ReviewFilters, ReviewFlagReason, ReviewSort } from "@/lib/types";
import { useReviewActions, useReviewSummary, useReviews } from "./api";

const REPLY_MAX = 1000;
const NOTE_MAX = 500;
const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "NEWEST", label: "الأحدث" },
  { value: "OLDEST", label: "الأقدم" },
  { value: "HIGHEST", label: "الأعلى تقييم" },
  { value: "LOWEST", label: "الأقل تقييم" },
];
const REASONS: { value: ReviewFlagReason; label: string }[] = [
  { value: "SPAM", label: "سبام أو إعلان" },
  { value: "OFFENSIVE", label: "كلام مسيء" },
  { value: "NOT_ABOUT_PRODUCT", label: "مش عن القطعة" },
  { value: "FAKE", label: "تقييم مزيف" },
  { value: "PERSONAL_INFO", label: "فيه بيانات شخصية" },
  { value: "OTHER", label: "سبب تاني" },
];
const ID = /^[0-9a-fA-F-]{36}$/;

/** Filters live in the URL so a product page or a notification can link straight to a filtered view. */
function readFilters(params: URLSearchParams): { filters: ReviewFilters; page: number } {
  const sort = params.get("sort");
  const rating = Number(params.get("rating"));
  const show = params.get("show");
  const product = params.get("product");
  return {
    filters: {
      sort: SORTS.some((s) => s.value === sort) ? (sort as ReviewSort) : "NEWEST",
      rating: rating >= 1 && rating <= 5 && Number.isInteger(rating) ? rating : undefined,
      replied: show === "awaiting" ? false : show === "replied" ? true : undefined,
      withPhotos: params.get("photos") === "1" || undefined,
      productId: product && ID.test(product) ? product : undefined,
    },
    page: Math.max(0, Math.min(10_000, Number.parseInt(params.get("page") ?? "0", 10) || 0)),
  };
}

/** A contact detail in a public reply: the backend refuses these, so the seller hears it before sending. */
const CONTACT = /(\d[\s-]?){8,}|https?:\/\/|www\.|\.(com|net|org|eg)\b/i;

function replyProblem(v: string) {
  const t = v.trim();
  if (!t) return "الحقل ده مطلوب";
  if (t.length > REPLY_MAX) return `الحد الأقصى ${REPLY_MAX} حرف`;
  if (CONTACT.test(t)) return "شيل أرقام التليفون واللينكات من الرد عشان يتنشر.";
  return null;
}

export function ReviewsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { filters, page } = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const reviews = useReviews(filters, page);
  const summary = useReviewSummary();

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const filtered = filters.rating != null || filters.replied != null || filters.withPhotos || filters.productId;
  const awaiting = summary.data?.awaitingReplyCount ?? null;
  const productName = filters.productId ? reviews.data?.content[0]?.productName : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="enter text-meta font-bold text-accent-text">{awaiting ? `${formatCount(awaiting)} مستني ردك` : "كلام عملائك عن شغلك"}</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          التقييمات
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr] xl:grid-cols-[20rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Summary activeRating={filters.rating} onRating={(r) => setParams({ rating: r === filters.rating ? null : String(r) })} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip on={filters.replied === false} onClick={() => setParams({ show: filters.replied === false ? null : "awaiting" })}>
              <ChatCircleText className="size-4" aria-hidden="true" />
              {awaiting ? `مستني ردك (${formatCount(awaiting)})` : "مستني ردك"}
            </Chip>
            <Chip on={filters.replied === true} onClick={() => setParams({ show: filters.replied === true ? null : "replied" })}>
              اترد عليه
            </Chip>
            <Chip on={!!filters.withPhotos} onClick={() => setParams({ photos: filters.withPhotos ? null : "1" })}>
              <Images className="size-4" aria-hidden="true" />
              بصور
            </Chip>
            {filters.rating != null && (
              <Chip on onClick={() => setParams({ rating: null })} removable>
                {filters.rating === 1 ? "نجمة واحدة" : `${filters.rating} نجوم`}
              </Chip>
            )}
            {filters.productId && (
              <Chip on onClick={() => setParams({ product: null })} removable>
                القطعة: {productName ?? "قطعة واحدة"}
              </Chip>
            )}
            <div className="ms-auto w-44">
              <SelectField id="review-sort" label="الترتيب" value={filters.sort} onChange={(e) => setParams({ sort: e.target.value === "NEWEST" ? null : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {reviews.isPending ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : reviews.isError ? (
            <SectionError message="معرفناش نجيب التقييمات." />
          ) : reviews.data.content.length === 0 ? (
            filtered ? (
              filters.replied === false && filters.rating == null && !filters.withPhotos ? (
                <StateView illustration="emptySpool" title="مفيش حد مستني رد" body="رديت على الكل. الرد السريع بيطمّن اللي لسه جايين يشتروا." />
              ) : (
                <StateView
                  illustration="threadSearch"
                  title="مفيش تقييمات بالفلتر ده"
                  body="جرّب تشيل الفلتر أو تختار غيره."
                  action={
                    <Button variant="quiet" onClick={() => setParams({ show: null, rating: null, photos: null, product: null })}>
                      شيل الفلاتر
                    </Button>
                  }
                />
              )
            ) : (
              <StateView illustration="emptySpool" title="لسه مفيش تقييمات" body="أول ما عميل يقيّم قطعة استلمها، هتلاقي كلامه هنا وتقدر ترد عليه." />
            )
          ) : (
            <>
              <ul className={`flex flex-col gap-3 transition-opacity ${reviews.isPlaceholderData ? "opacity-60" : ""}`}>
                {reviews.data.content.map((r, i) => (
                  <m.li key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                    <ReviewCard review={r} />
                  </m.li>
                ))}
              </ul>
              <Pager label="صفحات التقييمات" page={page} totalPages={reviews.data.totalPages} onPage={(p) => setParams({ page: p ? String(p) : null })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, removable = false, children }: { on: boolean; onClick: () => void; removable?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-bold transition-colors duration-quick ${on ? "border-secondary bg-secondary text-on-secondary" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"}`}
    >
      {children}
      {removable && <X className="size-3.5" aria-label="شيل الفلتر" />}
    </button>
  );
}

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-rating" role="img" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} weight={n <= Math.round(value) ? "fill" : "regular"} className={`${size} ${n <= Math.round(value) ? "" : "text-line-strong"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Average, a histogram whose bars filter the list, and the counts worth acting on. */
function Summary({ activeRating, onRating }: { activeRating?: number; onRating: (r: number) => void }) {
  const summary = useReviewSummary();
  if (summary.isPending) return <Skeleton className="h-80" />;
  if (summary.isError) return <SectionError message="معرفناش نجيب ملخص التقييمات." />;
  const s = summary.data;
  const max = Math.max(1, ...s.ratingCounts.map((c) => c.count));

  return (
    <section aria-label="ملخص التقييمات" className="rounded-image-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-end gap-3">
        <p className="text-display leading-none font-extrabold">{s.totalReviews ? <CountUp value={s.averageRating} format={formatRating} /> : "—"}</p>
        <div className="pb-1">
          <Stars value={s.averageRating} />
          <p className="text-meta text-ink-3">من {formatCount(s.totalReviews)} تقييم</p>
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((r) => {
          const count = s.ratingCounts.find((c) => c.rating === r)?.count ?? 0;
          const on = activeRating === r;
          return (
            <li key={r}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${r} نجوم: ${count} تقييم`}
                onClick={() => onRating(r)}
                className={`group flex w-full items-center gap-2 rounded-tag px-1.5 py-1 text-meta transition-colors duration-quick hover:bg-paper ${on ? "bg-paper font-extrabold" : ""}`}
              >
                <span className="w-3 font-bold">{r}</span>
                <Star weight="fill" className="size-3.5 text-rating" aria-hidden="true" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={`block h-full rounded-full transition-[width] duration-emphasized ease-soft ${on ? "bg-primary" : "bg-secondary/70 group-hover:bg-secondary"}`} style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span className="w-8 text-end text-ink-3">{formatCount(count)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="stitch my-4 opacity-70" aria-hidden="true" />
      <p className="text-body-sm font-bold">{s.awaitingReplyCount ? `${formatCount(s.awaitingReplyCount)} تقييم مستني ردك` : "رديت على كل التقييمات، برافو عليك"}</p>
      <p className="text-meta text-ink-3">{formatCount(s.withPhotosCount)} تقييم بصور</p>
    </section>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const { remove } = useReviewActions();
  const toast = useToast();
  const hidden = r.status === "HIDDEN";

  return (
    <article className={`rounded-image-lg border bg-surface p-4 sm:p-5 ${r.sellerReply ? "border-line" : "border-primary/35"}`}>
      <div className="flex items-start gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-sunken text-body font-extrabold">
          {r.customerImage ? <Image src={r.customerImage} alt="" fill sizes="44px" className="object-cover" /> : (r.customerName?.[0] ?? "؟")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-body-sm font-bold">{r.customerName ?? "عميل"}</p>
            {r.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-meta font-semibold text-success">
                <SealCheck weight="fill" className="size-4" aria-hidden="true" />
                اشترى القطعة دي
              </span>
            )}
            {hidden && <Tag tone="warning">مخفي عن العملاء</Tag>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} />
            <span className="text-meta text-ink-3">
              {formatAgo(r.createdAt)}
              {r.edited && " · متعدّل"}
            </span>
          </div>
        </div>
        {r.productImage && (
          <span className="relative hidden size-12 shrink-0 overflow-hidden rounded-[10px] bg-surface-sunken sm:block" title={r.productName ?? undefined}>
            <Image src={r.productImage} alt={r.productName ?? ""} fill sizes="48px" className="object-cover" />
          </span>
        )}
      </div>

      {r.productName && <p className="mt-2 text-meta font-bold text-ink-2">{r.productName}</p>}
      <p className={`mt-2 text-body whitespace-pre-line ${r.comment ? "" : "text-ink-3"}`}>{r.comment || "قيّم بالنجوم بس من غير كلام"}</p>

      {!!r.photos?.length && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {r.photos.map((p, i) => (
            <li key={p}>
              <a href={p} target="_blank" rel="noopener noreferrer" className="group relative block size-20 overflow-hidden rounded-[12px] bg-surface-sunken">
                <Image src={p} alt={`صورة من العميل رقم ${i + 1}`} fill sizes="80px" className="object-cover transition-transform duration-emphasized ease-soft group-hover:scale-105" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {r.sellerReply && !composing && (
        <div className="mt-4 rounded-image border-s-[3px] border-primary bg-paper p-3.5">
          <p className="text-meta font-bold text-ink-2">
            ردك {r.sellerRepliedAt && <span className="font-normal text-ink-3">· {formatAgo(r.sellerRepliedAt)}</span>}
          </p>
          <p className="text-body-sm whitespace-pre-line">{r.sellerReply}</p>
        </div>
      )}

      {composing ? (
        <ReplyComposer review={r} onDone={() => setComposing(false)} />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {r.sellerReply ? (
            <>
              <ActionButton icon={PencilSimple} onClick={() => setComposing(true)}>
                عدّل الرد
              </ActionButton>
              <ActionButton icon={Trash} onClick={() => setDeleting(true)}>
                امسح الرد
              </ActionButton>
            </>
          ) : (
            <Button variant="secondary" className="min-h-10 px-4 text-body-sm" onClick={() => setComposing(true)}>
              <ChatCircleText className="size-4" aria-hidden="true" />
              رُد
            </Button>
          )}
          <ActionButton icon={Flag} onClick={() => setReporting(true)} className="ms-auto">
            بلّغ
          </ActionButton>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="تمسح ردك؟"
        body="الرد هيختفي من تحت التقييم، وتقدر ترد تاني في أي وقت."
        confirmLabel="امسح الرد"
        destructive
        busy={remove.isPending}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => {
              toast.show("ردك اتمسح");
              setDeleting(false);
            },
            onError: (e) => toast.show(e instanceof ApiError ? e.message : "معرفناش نمسح الرد. جرّب تاني.", { tone: "error" }),
          })
        }
      />
      <ReportDialog review={r} open={reporting} onClose={() => setReporting(false)} />
    </article>
  );
}

function ActionButton({ icon: I, onClick, children, className = "" }: { icon: typeof Flag; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-body-sm font-bold text-ink-2 transition-colors duration-quick hover:bg-surface-sunken hover:text-ink ${className}`}>
      <I className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function ReplyComposer({ review: r, onDone }: { review: Review; onDone: () => void }) {
  const { reply } = useReviewActions();
  const toast = useToast();
  const [text, setText] = useState(r.sellerReply ?? "");
  const [touched, setTouched] = useState(false);
  const problem = replyProblem(text);
  const editing = !!r.sellerReply;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || reply.isPending) return;
    reply.mutate(
      { id: r.id, reply: text.trim() },
      {
        onSuccess: () => {
          toast.show(editing ? "ردك اتعدّل" : "ردك اتنشر");
          onDone();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-2 rounded-image bg-paper p-3.5">
      <TextArea
        id={`reply-${r.id}`}
        label={`ردك على ${r.customerName ?? "العميل"}`}
        placeholder="شكراً إنك اخترت شغلي…"
        value={text}
        maxLength={REPLY_MAX}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setTouched(true)}
        error={(touched ? problem : null) ?? (reply.error instanceof ApiError ? reply.error.message : reply.isError ? "حصلت مشكلة. جرّب تاني بعد شوية." : null)}
        disabled={reply.isPending}
      />
      <div className="flex items-center justify-between text-meta text-ink-3">
        <span>ردك هيظهر للكل تحت التقييم. من غير أرقام تليفون أو لينكات.</span>
        <span className={text.length >= REPLY_MAX ? "font-bold text-error" : ""} dir="ltr">
          {text.length} / {REPLY_MAX}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="quiet" className="min-h-10 px-4 text-body-sm" onClick={onDone} disabled={reply.isPending}>
          رجوع
        </Button>
        <Button type="submit" className="min-h-10 px-4 text-body-sm" disabled={reply.isPending} aria-busy={reply.isPending}>
          {reply.isPending && <Spinner />}
          {editing ? "احفظ التعديل" : "انشر الرد"}
        </Button>
      </div>
    </form>
  );
}

function ReportDialog({ review: r, open, onClose }: { review: Review; open: boolean; onClose: () => void }) {
  const { report } = useReviewActions();
  const toast = useToast();
  const [reason, setReason] = useState<ReviewFlagReason | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const noteError = note.trim().length > NOTE_MAX ? `الحد الأقصى ${NOTE_MAX} حرف` : null;

  const close = () => {
    if (report.isPending) return;
    report.reset();
    setTried(false);
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!reason || noteError || report.isPending) return;
    report.mutate(
      { id: r.id, reason, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.show("وصلنا بلاغك، هنراجعه قريب");
          setReason(null);
          setNote("");
          close();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} title="بلّغ عن التقييم ده" locked={report.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-ink-2">فريقنا هيراجعه. لو طلع مخالف هيتخفي، أما التقييمات العادية حتى لو مش حلوة بتفضل ظاهرة.</p>
        <fieldset>
          <legend className="mb-2 text-meta font-bold text-ink-2">السبب</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REASONS.map((x) => (
              <label key={x.value} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border px-3 text-body-sm font-semibold transition-colors ${reason === x.value ? "border-secondary bg-secondary-container" : "border-line-strong hover:border-ink"}`}>
                <input type="radio" name={`reason-${r.id}`} value={x.value} checked={reason === x.value} onChange={() => setReason(x.value)} className="accent-[var(--hm-secondary)]" />
                {x.label}
              </label>
            ))}
          </div>
          {tried && !reason && <p className="mt-2 text-meta font-semibold text-error">اختار سبب الأول</p>}
        </fieldset>
        <TextArea id={`report-note-${r.id}`} label="تفاصيل (اختياري)" placeholder="قولنا أكتر لو حابب" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} error={noteError} disabled={report.isPending} />
        {report.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {report.error instanceof ApiError ? report.error.message : "حصلت مشكلة. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={close} disabled={report.isPending}>
            رجوع
          </Button>
          <Button type="submit" disabled={report.isPending} aria-busy={report.isPending}>
            {report.isPending && <Spinner />}
            ابعت البلاغ
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
