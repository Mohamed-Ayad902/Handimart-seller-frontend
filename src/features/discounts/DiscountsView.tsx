"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, MagnifyingGlass, PencilSimple, Plus, Tag, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag } from "@/components/ui/StatusTag";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatCount, formatDateTime, formatPrice } from "@/lib/format";
import type { Discount, DiscountType } from "@/lib/types";
import { cover } from "@/features/products/labels";
import { useDeleteDiscount, useDiscounts, usePickableProducts, useSaveDiscount, useToggleDiscount } from "./api";
import { NAME_MAX, discountStatus, fromLocalInput, priceWith, targetLabel, toLocalInput, valueLabel } from "./labels";

export function DiscountsView() {
  const list = useDiscounts();
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const items = list.data?.pages.flatMap((p) => p.content) ?? [];
  const running = items.filter((d) => d.status === "RUNNING").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="enter text-meta font-bold text-accent-text">{running ? `${formatCount(running)} عرض شغّال دلوقتي` : "الترويج"}</p>
          <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
            العروض والخصومات
          </h1>
          <p className="enter mt-1 text-body-sm text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>
            السعر بيتغيّر لوحده أول ما العرض يبدأ، ويرجع أول ما يخلص.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-5" aria-hidden="true" />
          عرض جديد
        </Button>
      </header>

      {list.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.isError ? (
        <SectionError message="معرفناش نجيب عروضك." />
      ) : !items.length ? (
        <StateView
          illustration="emptyBasket"
          title="مفيش عروض لسه"
          body="اعمل أول عرض: خصم بنسبة أو بمبلغ ثابت، على قطع معيّنة أو على المتجر كله."
          action={
            <Button variant="quiet" onClick={() => setEditing("new")}>
              اعمل عرض
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 lg:grid-cols-2">
            {items.map((d) => (
              <li key={d.id}>
                <DiscountCard discount={d} onEdit={() => setEditing(d)} />
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="quiet" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage && <Spinner />}
                اعرض أقدم
              </Button>
            </div>
          )}
        </>
      )}

      {editing && <DiscountEditor key={editing === "new" ? "new" : editing.id} discount={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DiscountCard({ discount: d, onEdit }: { discount: Discount; onEdit: () => void }) {
  const toast = useToast();
  const toggle = useToggleDiscount();
  const remove = useDeleteDiscount();
  const [confirm, setConfirm] = useState(false);
  const s = discountStatus(d);
  const usage = d.maxUsage ? Math.min(1, (d.currentUsage ?? 0) / d.maxUsage) : null;
  const fail = (e: unknown, fallback: string) => toast.show(e instanceof ApiError ? e.message : fallback, { tone: "error" });

  return (
    <article className="group flex h-full overflow-hidden rounded-image border border-line bg-surface transition-[transform,box-shadow] duration-standard ease-soft hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(42_19_48/0.55)] motion-reduce:hover:translate-y-0">
      {/* The coupon stub, torn from the card along a stitched line. */}
      <div className={`relative grid w-28 shrink-0 place-items-center px-2 text-center sm:w-32 ${d.valid ? "bg-secondary text-on-secondary" : "bg-surface-sunken text-ink-2"}`}>
        <span aria-hidden="true" className="absolute inset-y-3 end-0 border-e-[1.5px] border-dashed border-current opacity-30" />
        <span dir="ltr" className="text-title leading-tight font-extrabold tabular-nums">{valueLabel(d.type, d.value)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-subtitle font-extrabold">{d.name}</h2>
            <p className="text-meta text-ink-2">{targetLabel(d)}</p>
          </div>
          <Switch
            tone="secondary"
            on={d.active}
            busy={toggle.isPending}
            label={`تشغيل عرض ${d.name}`}
            onToggle={() =>
              toggle.mutate(
                { id: d.id, on: !d.active },
                { onSuccess: () => toast.show(d.active ? "العرض اتوقف والأسعار رجعت." : "العرض اتشغّل."), onError: (e) => fail(e, "معرفناش نغيّر العرض.") },
              )
            }
          />
        </div>
        <StatusTag tone={s.tone} className="self-start">
          {s.label}
        </StatusTag>
        <p className="text-meta text-ink-3">
          من {formatDateTime(d.startDate)} لـ {formatDateTime(d.endDate)}
        </p>
        {usage !== null && (
          <div>
            <p className="flex justify-between text-meta text-ink-2">
              <span>الاستخدام</span>
              <span className="tabular-nums">
                {formatCount(d.currentUsage ?? 0)} من {formatCount(d.maxUsage!)}
              </span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
              <div className="h-full origin-left rounded-full bg-secondary" style={{ width: `${usage * 100}%` }} />
            </div>
          </div>
        )}
        <div className="mt-auto flex justify-end gap-1 pt-1">
          <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-meta font-bold hover:bg-surface-sunken">
            <PencilSimple className="size-4" aria-hidden="true" />
            تعديل
          </button>
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-meta font-bold text-error hover:bg-error-container">
            <Trash className="size-4" aria-hidden="true" />
            حذف
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="حذف العرض"
        body={`متأكد إنك عايز تحذف عرض "${d.name}"؟ الأسعار هترجع زي ما كانت، ومش هتقدر ترجّعه.`}
        confirmLabel="احذف"
        destructive
        busy={remove.isPending}
        onConfirm={() =>
          remove.mutate(d.id, {
            onSuccess: () => {
              setConfirm(false);
              toast.show("العرض اتحذف.");
            },
            onError: (e) => fail(e, "معرفناش نحذف العرض."),
          })
        }
      />
    </article>
  );
}

const TYPES: { type: DiscountType; label: string }[] = [
  { type: "PERCENTAGE", label: "نسبة مئوية" },
  { type: "FIXED_AMOUNT", label: "مبلغ ثابت" },
];

function DiscountEditor({ discount, onClose }: { discount: Discount | null; onClose: () => void }) {
  const save = useSaveDiscount();
  const toast = useToast();
  const products = usePickableProducts(true);
  const [name, setName] = useState(discount?.name ?? "");
  const [type, setType] = useState<DiscountType>(discount?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(discount ? String(discount.value) : "");
  const [maxUsage, setMaxUsage] = useState(discount?.maxUsage ? String(discount.maxUsage) : "");
  const [start, setStart] = useState(discount ? toLocalInput(discount.startDate) : "");
  const [end, setEnd] = useState(discount ? toLocalInput(discount.endDate) : "");
  const [picked, setPicked] = useState<string[]>(discount?.productIds ?? []);
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  // "Now" for the start-date check is when the editor opened (the backend allows a minute of slack).
  const [openedAt] = useState(() => Date.now());

  const amount = Number(value);
  const startIso = fromLocalInput(start);
  const endIso = fromLocalInput(end);
  const startUnchanged = !!discount && start === toLocalInput(discount.startDate);

  const errors = {
    name: !name.trim() ? "اكتب اسم العرض" : name.trim().length > NAME_MAX ? `الحد الأقصى ${NAME_MAX} حرف` : null,
    value:
      type === "FREE_SHIPPING"
        ? null
        : !value.trim() || !(amount > 0)
          ? "اكتب قيمة أكبر من صفر"
          : type === "PERCENTAGE" && amount > 100
            ? "النسبة لازم تكون من 1 لـ 100"
            : type === "FIXED_AMOUNT" && amount > 1_000_000
              ? "المبلغ كبير قوي"
              : null,
    maxUsage: maxUsage.trim() && !(Number.isInteger(Number(maxUsage)) && Number(maxUsage) >= 1) ? "اكتب رقم صحيح من 1 أو أكتر" : null,
    start: !startIso ? "اختار بداية العرض" : !startUnchanged && new Date(startIso).getTime() < openedAt - 60_000 ? "البداية لازم تكون من دلوقتي أو بعد كده" : null,
    end: !endIso ? "اختار نهاية العرض" : startIso && endIso <= startIso ? "النهاية لازم تكون بعد البداية" : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const all = useMemo(() => products.data?.content ?? [], [products.data]);
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || save.isPending || !startIso || !endIso) return;
    save.mutate(
      {
        id: discount?.id ?? null,
        body: { name: name.trim(), type, value: type === "FREE_SHIPPING" ? (discount?.value ?? 1) : amount, startDate: startIso, endDate: endIso, maxUsage: maxUsage.trim() ? Number(maxUsage) : null, productIds: picked },
      },
      {
        onSuccess: () => {
          toast.show(discount ? "العرض اتعدّل." : "العرض اتعمل.");
          onClose();
        },
      },
    );
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  return (
    <Dialog open onClose={() => !save.isPending && onClose()} title={discount ? "تعديل العرض" : "عرض جديد"} size="lg" locked={save.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* The coupon prints itself as the seller types, so they see what customers will see. */}
        <div className="relative flex overflow-hidden rounded-image bg-secondary text-on-secondary" aria-hidden="true">
          <span className="pointer-events-none absolute inset-2 rounded-[14px] border-[1.5px] border-dashed border-on-secondary/25" />
          <div className="grid w-32 shrink-0 place-items-center border-e-[1.5px] border-dashed border-on-secondary/25 py-5">
            <span dir="ltr" className="text-title font-extrabold tabular-nums">{type === "FREE_SHIPPING" || amount > 0 ? valueLabel(type, amount) : "—"}</span>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-4 py-5">
            <span className="text-meta font-bold text-on-secondary-accent">كوبون من ورشتك</span>
            <span className="truncate text-subtitle font-extrabold">{name.trim() || "اسم العرض"}</span>
          </div>
        </div>

        <TextField id="discount-name" label="اسم العرض" placeholder="مثال: خصم عيد الفطر" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} error={show("name")} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-meta font-bold text-ink-2">نوع الخصم</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(type === "FREE_SHIPPING" ? [...TYPES, { type: "FREE_SHIPPING" as const, label: "شحن مجاني" }] : TYPES).map((t) => (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={type === t.type}
                onClick={() => setType(t.type)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-body-sm font-bold transition-colors duration-quick ${type === t.type ? "border-secondary bg-secondary text-on-secondary" : "border-line-strong hover:border-ink"}`}
              >
                {type === t.type && <Check className="size-4" aria-hidden="true" />}
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {type !== "FREE_SHIPPING" && (
            <TextField
              id="discount-value"
              label={type === "PERCENTAGE" ? "قيمة الخصم (%)" : "قيمة الخصم (ج.م)"}
              inputMode="decimal"
              dir="ltr"
              className="text-end"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
              error={show("value")}
            />
          )}
          <TextField id="discount-max" label="أقصى عدد مرات استخدام (اختياري)" placeholder="مثال: 100" inputMode="numeric" dir="ltr" className="text-end" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value.replace(/\D/g, ""))} error={show("maxUsage")} hint="سيبه فاضي لو مفيش حد" />
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-meta font-bold text-ink-2">فترة العرض</legend>
          <TextField id="discount-start" type="datetime-local" label="من" value={start} onChange={(e) => setStart(e.target.value)} error={show("start")} />
          <TextField id="discount-end" type="datetime-local" label="لحد" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} error={show("end")} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-meta font-bold text-ink-2">القطع اللي عليها العرض</legend>
          <p className="text-meta text-ink-3">{picked.length ? `${formatCount(picked.length)} قطع متحددة` : "مفيش قطع متحددة: العرض هيبقى على كل قطع المتجر."} القطعة ممكن تبقى في عرض واحد بس، فلو كانت في عرض تاني هتتشال منه.</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <MagnifyingGlass className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <label htmlFor="discount-search" className="sr-only">
                دوّر على قطعة
              </label>
              <input id="discount-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="دوّر على قطعة" className="h-11 w-full rounded-control border border-line-strong bg-surface ps-9 pe-3 text-body-sm focus:border-ink" />
            </div>
            <Button variant="quiet" className="min-h-11 px-4 text-body-sm" onClick={() => setPicked(all.map((p) => p.id))} disabled={!all.length}>
              اختار الكل
            </Button>
            <Button variant="quiet" className="min-h-11 px-4 text-body-sm" onClick={() => setPicked([])} disabled={!picked.length}>
              امسح الاختيار
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain rounded-image border border-line" data-lenis-prevent="">
            {products.isPending ? (
              <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : products.isError ? (
              <p className="p-4 text-body-sm text-error">معرفناش نجيب قطعك.</p>
            ) : !matches.length ? (
              <p className="p-4 text-body-sm text-ink-2">مفيش قطع بالاسم ده.</p>
            ) : (
              <ul>
                {matches.map((p) => {
                  const on = picked.includes(p.id);
                  const after = priceWith(p.basePrice, type, amount);
                  const img = cover(p);
                  return (
                    <li key={p.id} className="border-b border-dashed border-line last:border-0">
                      <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-paper">
                        <input type="checkbox" checked={on} onChange={() => setPicked((ids) => (on ? ids.filter((x) => x !== p.id) : [...ids, p.id]))} className="size-5 accent-[var(--hm-secondary)]" />
                        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-surface-sunken">{img ? <Image src={img} alt="" fill sizes="40px" className="object-cover" /> : <Tag className="size-5 text-ink-3" aria-hidden="true" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm font-bold">{p.name}</span>
                          <span className="text-meta text-ink-3 tabular-nums">
                            {after !== null && on ? (
                              <>
                                <span className="line-through">{formatPrice(p.basePrice)}</span> ← <span className="font-bold text-accent-text">{formatPrice(after)}</span>
                              </>
                            ) : (
                              formatPrice(p.basePrice)
                            )}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </fieldset>

        {save.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {save.error instanceof ApiError ? save.error.message : "حصلت مشكلة. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={onClose} disabled={save.isPending}>
            رجوع
          </Button>
          <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending && <Spinner />}
            {discount ? "احفظ التعديلات" : "اعمل العرض"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
