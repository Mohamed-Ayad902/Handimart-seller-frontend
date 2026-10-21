"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChatCircleDots, HandPalm, Package, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea, TextField } from "@/components/ui/Field";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag } from "@/components/ui/StatusTag";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatAgo, formatDateTime, formatPrice } from "@/lib/format";
import type { CustomRequest } from "@/lib/types";
import { parseNumber } from "@/lib/validation";
import { useRequest, useRequestStep } from "./api";
import { EVENT_LABEL, LIMITS, daysToMinutes, headline, minutesToDays, preparationLabel, requestStatus } from "./labels";

/** No phone numbers or links: the whole agreement stays inside HandiMart (app `scr_offer_note_helper`). */
function textProblem(v: string, optional = false): string | null {
  const t = v.trim();
  if (!t) return optional ? null : "الحقل ده مطلوب";
  if (t.length < LIMITS.TEXT_MIN) return `الحد الأدنى ${LIMITS.TEXT_MIN} أحرف`;
  if (t.length > LIMITS.TEXT_MAX) return `الحد الأقصى ${LIMITS.TEXT_MAX} حرف`;
  return null;
}

export function RequestDetail({ id }: { id: string }) {
  const request = useRequest(id);

  if (request.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  if (request.isError) {
    const notFound = request.error instanceof ApiError && (request.error.status === 404 || request.error.status === 403);
    return notFound ? (
      <StateView illustration="threadSearch" title="الطلب ده مش موجود" body="ممكن يكون اتلغى أو مش تبع متجرك." action={<BackLink />} />
    ) : (
      <SectionError message="معرفناش نفتح الطلب ده. جرّب تاني بعد شوية." />
    );
  }
  return <Detail request={request.data} />;
}

function BackLink() {
  return (
    <Link href="/requests" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-bold hover:text-accent-text">
      <ArrowRight className="size-4" aria-hidden="true" />
      كل طلبات التفصيل
    </Link>
  );
}

function Detail({ request: r }: { request: CustomRequest }) {
  const s = requestStatus(r);
  const can = (a: string) => r.actions?.includes(a) ?? false;
  const [asking, setAsking] = useState(false);
  const [declining, setDeclining] = useState(false);

  return (
    <article className="page-enter flex flex-col gap-6" aria-labelledby="request-title">
      <div className="lg:hidden">
        <BackLink />
      </div>

      <header className="relative overflow-hidden rounded-image-lg bg-secondary p-5 text-on-secondary sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[18px] border-[1.5px] border-dashed border-on-secondary/25" />
        <div className="relative flex gap-4">
          <span className="relative size-20 shrink-0 overflow-hidden rounded-image bg-on-secondary/10 sm:size-24">
            {r.productImageUrl && <Image src={r.productImageUrl} alt="" fill sizes="96px" className="object-cover" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-meta font-bold text-on-secondary-accent">{r.customerName ? `طلب تفصيل من ${r.customerName}` : "طلب تفصيل"}</p>
            <h2 id="request-title" className="text-title font-extrabold">
              {r.productName}
            </h2>
            <p className="mt-1 text-body-sm opacity-85">{headline(r)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusTag tone={s.tone}>{s.label}</StatusTag>
              {s.deadline && r.expiresAt && <span className="text-meta font-bold text-on-secondary-accent">{`${s.deadline} ${formatDateTime(r.expiresAt)}`}</span>}
            </div>
          </div>
        </div>
      </header>

      <Section title="العميل عايز إيه">
        <p className="text-body whitespace-pre-line">{r.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-3">
          <Fact label="العدد" value={`${r.quantity} قطعة`} />
          <Fact label="سعرها دلوقتي" value={formatPrice(r.baseUnitPrice)} />
          <Fact label="تجهيزها" value={preparationLabel(r.basePreparationMinutes)} />
        </dl>
        {!!r.photoUrls?.length && <Photos title="صور للتوضيح" urls={r.photoUrls} />}
      </Section>

      {(r.sellerQuestion || r.customerAnswer) && (
        <Section title="سؤالك والرد">
          {r.sellerQuestion && <Bubble who="سألت" text={r.sellerQuestion} mine />}
          {r.customerAnswer ? <Bubble who="العميل رد" text={r.customerAnswer} /> : <p className="text-body-sm text-ink-3">لسه العميل مردّش.</p>}
        </Section>
      )}

      {r.offeredUnitPrice != null && !can("SEND_OFFER") && <OfferSummary request={r} />}

      {r.orderId && (
        <Link href={`/orders?open=${r.orderId}`} className="flex items-center gap-3 rounded-image border border-success/30 bg-success-container/60 p-4 text-body-sm font-bold">
          <Package className="size-5 text-success" aria-hidden="true" />
          اتعمل طلب بالقطعة دي، هتلاقيه في الطلبات.
          <ArrowLeft className="ms-auto size-4" aria-hidden="true" />
        </Link>
      )}

      {r.closingReason && <p className="rounded-image bg-surface-sunken/60 p-4 text-body-sm">السبب: {r.closingReason}</p>}

      {can("SEND_OFFER") && <OfferComposer request={r} />}

      {(can("ASK_INFO") || can("DECLINE")) && (
        <div className="flex flex-wrap gap-3">
          {can("ASK_INFO") && (
            <Button variant="quiet" onClick={() => setAsking(true)}>
              <ChatCircleDots className="size-5" aria-hidden="true" />
              اسأل العميل
            </Button>
          )}
          {can("DECLINE") && (
            <Button variant="danger" onClick={() => setDeclining(true)}>
              <HandPalm className="size-5" aria-hidden="true" />
              مش هقدر أعملها
            </Button>
          )}
        </div>
      )}

      {!!r.events?.length && (
        <Section title="اللي حصل">
          <ol className="relative flex flex-col gap-4 ps-6">
            <span aria-hidden="true" className="absolute inset-y-1 start-[7px] border-s-2 border-dashed border-line-strong" />
            {[...r.events].reverse().map((e, i) => (
              <li key={`${e.type}-${e.createdAt}-${i}`} className="relative">
                <span aria-hidden="true" className={`absolute -start-6 top-1.5 size-3.5 rotate-45 rounded-[3px] ${i === 0 ? "bg-primary" : "bg-line-strong"}`} />
                <p className="text-body-sm font-bold">{EVENT_LABEL[e.type] ?? "تحديث على الطلب"}</p>
                <p className="text-meta text-ink-3">{formatAgo(e.createdAt)}</p>
                {e.unitPrice != null && (
                  <p className="text-meta text-ink-2">
                    {formatPrice(e.unitPrice)}
                    {e.preparationMinutes != null && ` · ${preparationLabel(e.preparationMinutes)}`}
                  </p>
                )}
                {e.note && <p className="mt-1 text-body-sm text-ink-2 whitespace-pre-line">{e.note}</p>}
                {!!e.photoUrls?.length && <Photos urls={e.photoUrls} small />}
              </li>
            ))}
          </ol>
        </Section>
      )}

      <AskDialog request={r} open={asking} onClose={() => setAsking(false)} />
      <DeclineDialog request={r} open={declining} onClose={() => setDeclining(false)} />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-image-lg border border-line bg-surface p-5 sm:p-6" aria-label={title}>
      <h3 className="mb-3 text-meta font-bold text-accent-text">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function Bubble({ who, text, mine = false }: { who: string; text: string; mine?: boolean }) {
  return (
    <div className={`mb-3 max-w-[85%] rounded-image p-3.5 ${mine ? "ms-auto bg-secondary-container" : "bg-surface-sunken/70"}`}>
      <p className="text-meta font-bold text-ink-2">{who}</p>
      <p className="text-body-sm whitespace-pre-line">{text}</p>
    </div>
  );
}

/** Private photos come as short-lived signed links (handover R3): shown as they are, never cached by the optimiser. */
function Photos({ urls, title, small = false }: { urls: string[]; title?: string; small?: boolean }) {
  return (
    <div className="mt-4">
      {title && <p className="mb-2 text-meta font-bold text-ink-2">{title}</p>}
      <ul className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <li key={u}>
            <a href={u} target="_blank" rel="noopener noreferrer" className={`group relative block overflow-hidden rounded-[12px] bg-surface-sunken ${small ? "size-16" : "size-24"}`}>
              <Image src={u} alt={`صورة توضيحية ${i + 1}`} fill unoptimized sizes="96px" className="object-cover transition-transform duration-emphasized ease-soft group-hover:scale-105" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfferSummary({ request: r }: { request: CustomRequest }) {
  return (
    <Section title="عرضك">
      <dl className="grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-3">
        <Fact label="سعر القطعة" value={formatPrice(r.offeredUnitPrice!)} />
        {r.offeredPreparationMinutes != null && <Fact label="مدة التجهيز" value={preparationLabel(r.offeredPreparationMinutes)} />}
        {r.offerTotal != null && <Fact label="إجمالي العرض" value={formatPrice(r.offerTotal)} />}
      </dl>
      {r.sellerNote && <p className="mt-3 text-body-sm text-ink-2">ملاحظتك: {r.sellerNote}</p>}
      {!!r.sellerPhotoUrls?.length && <Photos title="صور من عندك" urls={r.sellerPhotoUrls} small />}
    </Section>
  );
}

/** "+٥٠ ج.م أغلى من سعر القطعة": the difference the customer will see, worked out as the seller types. */
function priceDiff(price: number | null, base: number) {
  if (price == null) return null;
  const d = Math.round((price - base) * 100) / 100;
  if (d === 0) return "نفس سعر القطعة";
  return d > 0 ? `أغلى بـ ${formatPrice(d)} من سعر القطعة` : `أرخص بـ ${formatPrice(-d)} من سعر القطعة`;
}

function timeDiff(days: number | null, baseDays: number) {
  if (days == null) return null;
  const d = days - baseDays;
  if (d === 0) return "نفس مدة التجهيز";
  return d > 0 ? `أطول بـ ${d} يوم` : `أسرع بـ ${-d} يوم`;
}

function OfferComposer({ request: r }: { request: CustomRequest }) {
  const { offer } = useRequestStep(r.id);
  const toast = useToast();
  const baseDays = minutesToDays(r.basePreparationMinutes);
  const [price, setPrice] = useState(String(r.offeredUnitPrice ?? r.baseUnitPrice));
  const [days, setDays] = useState(String(r.offeredPreparationMinutes != null ? minutesToDays(r.offeredPreparationMinutes) : baseDays));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const p = parseNumber(price);
  const d = parseNumber(days);
  const priceError = p == null ? (price.trim() ? "اكتب رقم صحيح" : "الحقل ده مطلوب") : p < LIMITS.MIN_PRICE ? `لازم القيمة متقلش عن ${LIMITS.MIN_PRICE}` : p > LIMITS.MAX_PRICE ? `لازم القيمة متزيدش عن ${formatPrice(LIMITS.MAX_PRICE)}` : null;
  const daysError = d == null || !Number.isInteger(d) ? (days.trim() ? "اكتب عدد أيام صحيح" : "الحقل ده مطلوب") : d > LIMITS.MAX_DAYS ? `لازم القيمة متزيدش عن ${LIMITS.MAX_DAYS}` : null;
  const noteError = textProblem(note, true);
  const total = p != null && !priceError ? p * r.quantity : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (priceError || daysError || noteError || offer.isPending) return;
    setServerError(null);
    // Unchanged days keep the product's exact minutes instead of rounding them to whole days (app behaviour).
    const minutes = d === baseDays ? r.basePreparationMinutes : daysToMinutes(d!);
    offer.mutate(
      { offer: { unitPrice: p!, preparationMinutes: minutes, note: note.trim() || null }, photos },
      {
        onSuccess: () => {
          toast.show("عرضك اتبعت للعميل ✅");
          setPhotos([]);
          setNote("");
          setTouched(false);
        },
        onError: (err) => setServerError(err instanceof ApiError ? err.message : "حصلت مشكلة. جرّب تاني بعد شوية."),
      },
    );
  };

  return (
    <section aria-labelledby="offer-title" className="rounded-image-lg border-[1.5px] border-primary/40 bg-surface p-5 sm:p-6">
      <h3 id="offer-title" className="text-title font-extrabold">
        عرضك
      </h3>
      <p className="mt-1 text-body-sm text-ink-2">ممكن السعر والمدة يطلعوا أقل أو أكتر من القطعة الأصلية، والعميل هيشوف الفرق قبل ما يوافق.</p>
      <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="offer-price"
            label="سعر القطعة بعد التعديل (ج.م)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched ? priceError : null}
            hint={priceDiff(p, r.baseUnitPrice) ?? undefined}
            disabled={offer.isPending}
          />
          <TextField
            id="offer-days"
            label="مدة التجهيز (بالأيام)"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/[^\d٠-٩]/g, "").slice(0, 3))}
            onBlur={() => setTouched(true)}
            error={touched ? daysError : null}
            hint={timeDiff(d, baseDays) ?? undefined}
            disabled={offer.isPending}
          />
        </div>
        <TextArea
          id="offer-note"
          label="ملاحظة للعميل (اختياري)"
          placeholder="مثلاً: هستخدم خيط قطن بدل الصوف"
          value={note}
          maxLength={LIMITS.TEXT_MAX}
          onChange={(e) => setNote(e.target.value)}
          error={touched ? noteError : null}
          disabled={offer.isPending}
        />
        <p className="-mt-2 text-meta text-ink-3">الاتفاق كله جوه HandiMart، من غير أرقام تليفون أو لينكات.</p>
        <PhotoPicker files={photos} onChange={setPhotos} max={LIMITS.MAX_REPLY_PHOTOS} label="صور من عندك" disabled={offer.isPending} />

        <div className="stitch opacity-70" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div aria-live="polite">
            <p className="text-meta font-bold text-ink-2">إجمالي العرض ({r.quantity} قطعة)</p>
            <p className="text-price-lg font-extrabold">{total != null ? formatPrice(total) : "—"}</p>
          </div>
          <Button type="submit" disabled={offer.isPending} aria-busy={offer.isPending}>
            {offer.isPending ? <Spinner /> : <PaperPlaneTilt className="size-5" aria-hidden="true" />}
            ابعت العرض
          </Button>
        </div>
        {serverError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {serverError}
          </p>
        )}
      </form>
    </section>
  );
}

function AskDialog({ request: r, open, onClose }: { request: CustomRequest; open: boolean; onClose: () => void }) {
  const { ask } = useRequestStep(r.id);
  const toast = useToast();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [touched, setTouched] = useState(false);
  const problem = textProblem(text);

  const close = () => {
    if (ask.isPending) return;
    ask.reset();
    setTouched(false);
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || ask.isPending) return;
    ask.mutate(
      { text: text.trim(), photos },
      {
        onSuccess: () => {
          toast.show("سؤالك وصل للعميل");
          setText("");
          setPhotos([]);
          close();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} title="محتاج توضيح؟" locked={ask.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-ink-2">سؤال واحد بس عن الطلب ده، والعميل هيرد عليه من الأبلكيشن.</p>
        <TextArea id="ask-text" label="سؤالك" placeholder="مثلاً: المقاس المطلوب بالسنتي كام؟" value={text} maxLength={LIMITS.TEXT_MAX} onChange={(e) => setText(e.target.value)} error={touched ? problem : null} disabled={ask.isPending} />
        <PhotoPicker files={photos} onChange={setPhotos} max={LIMITS.MAX_REPLY_PHOTOS} label="صور توضّح سؤالك" disabled={ask.isPending} />
        {ask.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {ask.error instanceof ApiError ? ask.error.message : "حصلت مشكلة. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={close} disabled={ask.isPending}>
            رجوع
          </Button>
          <Button type="submit" disabled={ask.isPending} aria-busy={ask.isPending}>
            {ask.isPending && <Spinner />}
            ابعت السؤال
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeclineDialog({ request: r, open, onClose }: { request: CustomRequest; open: boolean; onClose: () => void }) {
  const { decline } = useRequestStep(r.id);
  const toast = useToast();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const problem = textProblem(text);

  const close = () => {
    if (decline.isPending) return;
    decline.reset();
    setTouched(false);
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || decline.isPending) return;
    decline.mutate(text.trim(), {
      onSuccess: () => {
        toast.show("اعتذرت عن الطلب");
        setText("");
        close();
      },
    });
  };

  return (
    <Dialog open={open} onClose={close} title="تعتذر عن الطلب؟" locked={decline.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-ink-2">العميل هيعرف إنك مش هتقدر تنفّذه، وهيشوف السبب اللي هتكتبه.</p>
        <TextArea id="decline-text" label="السبب" placeholder="مثلاً: الخامة دي مش متوفرة عندي الفترة دي" value={text} maxLength={LIMITS.TEXT_MAX} onChange={(e) => setText(e.target.value)} error={touched ? problem : null} disabled={decline.isPending} />
        {decline.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {decline.error instanceof ApiError ? decline.error.message : "حصلت مشكلة. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={close} disabled={decline.isPending}>
            رجوع
          </Button>
          <Button type="submit" variant="danger" disabled={decline.isPending} aria-busy={decline.isPending}>
            {decline.isPending && <Spinner />}
            اعتذر عن الطلب
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
