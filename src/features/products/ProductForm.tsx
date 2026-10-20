"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { ArrowRight, Check, Package, Timer } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { useForm } from "@/hooks/useForm";
import { ApiError } from "@/lib/client/api";
import { SHIPPING_FLAGS, type Customization, type Product, type ProductMedia, type ProductRequest, type ProductType, type ShippingFlag } from "@/lib/types";
import { MSG, numberCheck, parseNumber, text } from "@/lib/validation";
import { flattenCategories, useCategories, useProduct, useSaveProduct } from "./api";
import { CustomizationEditor } from "./CustomizationEditor";
import { FLAG, TYPE } from "./labels";
import { MEDIA_MSG, UPLOAD_BUDGET, totalBytes, type PickedMedia } from "./media";
import { MediaPicker } from "./MediaPicker";

const STEPS = [
  { id: "piece", label: "القطعة", title: "عرّف العملاء بالقطعة", body: "صور واضحة واسم وحكاية قصيرة: ده اللي بيبيع." },
  { id: "price", label: "السعر والكمية", title: "سعرها وطريقة شغلها", body: "جاهزة عندك ولا بتتعمل لما حد يطلبها؟" },
  { id: "shipping", label: "الشحن والخيارات", title: "إزاي توصل، وإيه يختار العميل", body: "ملاحظات المندوب ومقاس الطرد، والخيارات لو فيه." },
] as const;

type Field = "name" | "description" | "categoryId" | "productType" | "price" | "stock" | "prepAmount" | "prepUnit" | "weight" | "length" | "width" | "height";

const FIELD_STEP: Record<Field, (typeof STEPS)[number]["id"]> = {
  name: "piece",
  description: "piece",
  categoryId: "piece",
  productType: "price",
  price: "price",
  stock: "price",
  prepAmount: "price",
  prepUnit: "price",
  weight: "shipping",
  length: "shipping",
  width: "shipping",
  height: "shipping",
};

/** Backend field names (`ProductRequest`) to this form's, for server-side validation messages. */
const SERVER_FIELDS: Record<string, Field> = { name: "name", description: "description", categoryId: "categoryId", price: "price", stockQuantity: "stock", preparationTimeMinutes: "prepAmount" };

const UNIT_MINUTES = { hours: 60, days: 24 * 60 } as const;
const dimension = numberCheck({ min: 0.01, max: 100_000 });

/** The app's checks for a piece (CreateProductVM.handleSubmit), with Core's messages. */
const CHECKS = {
  name: text({ min: 3, max: 100 }),
  description: text({ min: 10, max: 1000 }),
  categoryId: (v: string) => (v ? null : MSG.required),
  price: numberCheck({ min: 0.01, max: 10_000_000 }),
  stock: (v: string, all: Record<Field, string>) => (all.productType === "READY_MADE" ? numberCheck({ min: 0, max: 99_999, whole: true })(v) : null),
  prepAmount: (v: string, all: Record<Field, string>) => (all.productType === "MADE_TO_ORDER" ? numberCheck({ min: 1, max: all.prepUnit === "days" ? 365 : 24 * 365, whole: true })(v) : null),
  weight: dimension,
  length: dimension,
  width: dimension,
  height: dimension,
};

function initialValues(p: Product | null): Record<Field, string> {
  const minutes = p?.estimatedDeliveryTimeMinutes ?? 0;
  const days = minutes > 0 && minutes % UNIT_MINUTES.days === 0;
  const num = (n: number | null | undefined) => (n != null ? String(n) : "");
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    categoryId: p?.categoryId ?? "",
    productType: p?.productType ?? "READY_MADE",
    price: num(p?.basePrice),
    stock: num(p?.stockQuantity ?? (p ? 0 : null)),
    prepAmount: minutes ? String(days ? minutes / UNIT_MINUTES.days : Math.ceil(minutes / UNIT_MINUTES.hours)) : "",
    prepUnit: days ? "days" : "hours",
    weight: num(p?.dimensions?.weightKg),
    length: num(p?.dimensions?.lengthCm),
    width: num(p?.dimensions?.widthCm),
    height: num(p?.dimensions?.heightCm),
  };
}

/** New piece, or edit of an existing one (loaded from the seller's list: there is no GET-by-id). */
export function ProductForm({ id }: { id: string | null }) {
  if (!id) return <Form product={null} />;
  return <EditLoader id={id} />;
}

function EditLoader({ id }: { id: string }) {
  const { product, isPending, isError, notFound, refetch } = useProduct(id);
  if (isPending)
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="بنحمّل القطعة">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  if (isError) return <StateView illustration="tangledThread" title="معرفناش نجيب القطعة" action={<Button onClick={() => refetch()}>حاول مرة أخرى</Button>} />;
  if (notFound || !product) return <StateView illustration="cutThread" title="القطعة دي مش موجودة" action={<ButtonLink href="/products">ارجع للمنتجات</ButtonLink>} />;
  return <Form product={product} />;
}

function Form({ product }: { product: Product | null }) {
  const router = useRouter();
  const toast = useToast();
  const editing = product !== null;
  const save = useSaveProduct();
  const categories = useCategories();
  const options = useMemo(() => flattenCategories(categories.data ?? []), [categories.data]);

  const form = useForm<Field>(initialValues(product), CHECKS);
  const [existing, setExisting] = useState<ProductMedia[]>(() => product?.media.filter((x) => x.url && x.type !== "UNKNOWN") ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedMedia[]>([]);
  const [flags, setFlags] = useState<ShippingFlag[]>(product?.shippingFlags ?? []);
  const [customizations, setCustomizations] = useState<Customization[]>(product?.customizations ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const type = form.values.productType as ProductType;
  const mediaError = submitted && existing.length + picked.length === 0 ? MEDIA_MSG.none : null;
  const flagsError = submitted && flags.length === 0 ? "اختار ملاحظة شحن واحدة على الأقل." : null;

  // Leaving with unsaved work asks first (browser prompt); in-app links are plain navigations.
  useEffect(() => {
    if (!dirty || save.isSuccess) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, save.isSuccess]);

  const field = (key: Field) => {
    const f = form.field(key);
    return {
      ...f,
      onChange: (e: { target: { value: string } }) => {
        setDirty(true);
        f.onChange(e);
      },
    };
  };

  const firstProblem = (): (typeof STEPS)[number]["id"] | null => {
    const formOk = form.validate();
    if (existing.length + picked.length === 0) return "piece";
    if (!formOk) {
      const order: Field[] = ["name", "description", "categoryId", "price", "stock", "prepAmount", "weight", "length", "width", "height"];
      const bad = order.find((k) => CHECKS[k as keyof typeof CHECKS]?.(form.values[k], form.values));
      return bad ? FIELD_STEP[bad] : "piece";
    }
    if (flags.length === 0) return "shipping";
    if (totalBytes(picked) > UPLOAD_BUDGET) return "piece";
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);
    const problem = firstProblem();
    if (problem) {
      document.getElementById(problem)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      return;
    }
    const v = form.values;
    const unit = UNIT_MINUTES[v.prepUnit as keyof typeof UNIT_MINUTES] ?? UNIT_MINUTES.hours;
    const body: ProductRequest = {
      name: v.name.trim(),
      description: v.description.trim(),
      price: parseNumber(v.price)!,
      categoryId: v.categoryId,
      dimensions: { weightKg: parseNumber(v.weight), lengthCm: parseNumber(v.length), widthCm: parseNumber(v.width), heightCm: parseNumber(v.height) },
      productType: type,
      stockQuantity: type === "READY_MADE" ? parseNumber(v.stock)! : 0,
      preparationTimeMinutes: type === "MADE_TO_ORDER" ? parseNumber(v.prepAmount)! * unit : 1,
      shippingFlags: flags,
      attributes: {},
      customizations: customizations.map(({ label, required, values }) => ({ label, required, values: values.map(({ value, additionalPrice, additionalTimeMinutes }) => ({ value, additionalPrice: additionalPrice ?? 0, additionalTimeMinutes: additionalTimeMinutes ?? 0 })) })),
    };
    save.mutate(
      { id: product?.id ?? null, body, files: picked.map((p) => p.file), removeMediaIds: removed },
      {
        onSuccess: (saved) => {
          toast.show(editing ? "اتحفظت التعديلات، والقطعة رجعت للمراجعة" : "القطعة اتبعتت للمراجعة، وهتظهر للعملاء أول ما تتقبل");
          router.push(`/products/${saved?.id ?? product?.id ?? ""}`);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            const mapped = Object.fromEntries(Object.entries(err.fields).flatMap(([k, msg]) => (SERVER_FIELDS[k] ? [[SERVER_FIELDS[k], msg]] : [])));
            form.setServerErrors(mapped);
            setFailure(err.status === 413 ? MEDIA_MSG.budget : err.message);
          } else setFailure("حصلت مشكلة وإحنا بنحفظ القطعة. جرّب تاني.");
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href={editing ? `/products/${product.id}` : "/products"} className="group inline-flex w-fit min-h-11 items-center gap-1.5 text-body-sm font-bold text-ink-2 hover:text-ink">
          <ArrowRight className="size-4 transition-transform duration-standard ease-soft group-hover:translate-x-1" aria-hidden="true" />
          {editing ? product.name : "المنتجات"}
        </Link>
        <p className="enter text-meta font-bold text-accent-text">{editing ? "تعديل قطعة" : "قطعة جديدة"}</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          {editing ? "عدّل القطعة" : "ضيف قطعة لمعرضك"}
        </h1>
        {editing && <p className="text-body text-ink-2">أي تعديل بيرجّع القطعة للمراجعة قبل ما تظهر للعملاء تاني.</p>}
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_1fr] xl:gap-14">
        <StepRail />

        <div className="flex min-w-0 flex-col gap-14">
          <Section step={0}>
            <MediaPicker
              existing={existing}
              onRemoveExisting={(mediaId) => {
                setDirty(true);
                setExisting((list) => list.filter((x) => x.id !== mediaId));
                setRemoved((r) => [...r, mediaId]);
              }}
              picked={picked}
              onPickedChange={(next) => {
                setDirty(true);
                setPicked(next);
              }}
              error={mediaError}
            />
            <TextField id="name" label="اسم القطعة" maxLength={100} placeholder="مثلاً: كوباية فخار مرسومة بإيد" {...field("name")} />
            <TextArea id="description" label="حكاية القطعة" maxLength={1000} rows={5} placeholder="اتعملت إزاي، من إيه، وإيه اللي يميزها." {...field("description")} />
            <p className="-mt-3 text-end text-meta tabular-nums text-ink-3">{form.values.description.trim().length.toLocaleString("ar-EG")} / ١٠٠٠</p>
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-meta font-bold text-ink-2">القسم</span>
                <p className="flex min-h-12 items-center rounded-control border border-line bg-surface-sunken px-3.5 text-body text-ink-2">{product.categoryName}</p>
                <p className="text-meta text-ink-3">القسم مبيتغيرش بعد ما القطعة تتضاف.</p>
              </div>
            ) : categories.isError ? (
              <p role="alert" className="text-body-sm font-semibold text-error">
                معرفناش نجيب الأقسام.{" "}
                <button type="button" className="underline" onClick={() => categories.refetch()}>
                  جرّب تاني
                </button>
              </p>
            ) : (
              <SelectField id="categoryId" label="القسم" disabled={categories.isPending} {...field("categoryId")}>
                <option value="">{categories.isPending ? "بنحمّل الأقسام..." : "اختار القسم"}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            )}
          </Section>

          <Section step={1}>
            <fieldset disabled={editing} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-meta font-bold text-ink-2">طريقة شغلها {editing && <span className="font-normal text-ink-3">(مبتتغيرش بعد الإضافة)</span>}</legend>
              {(["READY_MADE", "MADE_TO_ORDER"] as const).map((t) => {
                const selected = type === t;
                const Icon = t === "READY_MADE" ? Package : Timer;
                return (
                  <label
                    key={t}
                    className={`relative flex cursor-pointer gap-3 rounded-image border-[1.5px] p-4 transition-[border-color,background-color] duration-quick has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                      selected ? "border-primary bg-primary-container/50" : "border-line-strong hover:border-ink"
                    } ${editing ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    <input type="radio" name="productType" value={t} checked={selected} onChange={() => form.set("productType", t)} className="sr-only" />
                    <Icon className={`size-7 shrink-0 ${selected ? "text-accent-text" : "text-ink-2"}`} aria-hidden="true" />
                    <span>
                      <span className="block text-body font-extrabold">{TYPE[t].label}</span>
                      <span className="block text-body-sm text-ink-2">{TYPE[t].body}</span>
                    </span>
                    {selected && (
                      <m.span layoutId="type-check" className="absolute end-3 top-3 grid size-6 place-items-center rounded-full bg-primary text-on-primary">
                        <Check className="size-4" weight="bold" aria-hidden="true" />
                      </m.span>
                    )}
                  </label>
                );
              })}
            </fieldset>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextField id="price" label="السعر (ج.م)" inputMode="decimal" dir="ltr" className="text-start" placeholder="250" {...field("price")} />
              {type === "READY_MADE" ? (
                <TextField id="stock" label="الكمية المتاحة" inputMode="numeric" dir="ltr" className="text-start" placeholder="5" hint="لو خلصت اكتب ٠، والقطعة هتبان «خلصت»." {...field("stock")} />
              ) : (
                <div className="grid grid-cols-[1fr_7.5rem] items-start gap-2">
                  <TextField id="prepAmount" label="وقت التجهيز" inputMode="numeric" dir="ltr" className="text-start" placeholder="3" {...field("prepAmount")} />
                  <SelectField id="prepUnit" label="بالـ" {...field("prepUnit")}>
                    <option value="hours">ساعات</option>
                    <option value="days">أيام</option>
                  </SelectField>
                </div>
              )}
            </div>
          </Section>

          <Section step={2}>
            <fieldset className="flex flex-col gap-3" aria-describedby={flagsError ? "flags-error" : undefined}>
              <legend className="mb-2 text-meta font-bold text-ink-2">ملاحظات الشحن للمندوب</legend>
              <div className="flex flex-wrap gap-2">
                {SHIPPING_FLAGS.map((f) => {
                  const on = flags.includes(f);
                  return (
                    <label
                      key={f}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-body-sm font-bold transition-[border-color,background-color,color] duration-quick has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                        on ? "border-ink bg-ink text-paper" : flagsError ? "border-error text-ink" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => {
                          setDirty(true);
                          setFlags((list) => (on ? list.filter((x) => x !== f) : [...list, f]));
                        }}
                      />
                      {on && <Check className="size-4" weight="bold" aria-hidden="true" />}
                      {FLAG[f].label}
                    </label>
                  );
                })}
              </div>
              {flagsError && (
                <p id="flags-error" className="text-meta font-semibold text-error">
                  {flagsError}
                </p>
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-meta font-bold text-ink-2">مقاس الطرد ووزنه</legend>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <TextField id="weight" label="الوزن (كجم)" inputMode="decimal" dir="ltr" className="text-start" {...field("weight")} />
                <TextField id="length" label="الطول (سم)" inputMode="decimal" dir="ltr" className="text-start" {...field("length")} />
                <TextField id="width" label="العرض (سم)" inputMode="decimal" dir="ltr" className="text-start" {...field("width")} />
                <TextField id="height" label="الارتفاع (سم)" inputMode="decimal" dir="ltr" className="text-start" {...field("height")} />
              </div>
            </fieldset>

            <CustomizationEditor
              value={customizations}
              onChange={(next) => {
                setDirty(true);
                setCustomizations(next);
              }}
            />
          </Section>

          <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-image-lg border border-line bg-surface/95 p-4 shadow-[0_12px_40px_-20px_rgb(42_19_48/0.35)] backdrop-blur sm:flex-row sm:items-center sm:justify-between md:bottom-4">
            <p className="text-body-sm text-ink-2" aria-live="polite">
              {failure ? (
                <span role="alert" className="font-semibold text-error">
                  {failure}
                </span>
              ) : save.isPending ? (
                picked.length ? "بنرفع الصور ونحفظ القطعة..." : "بنحفظ القطعة..."
              ) : (
                "القطعة بتتراجع قبل ما تظهر للعملاء."
              )}
            </p>
            <div className="flex gap-3">
              <ButtonLink href={editing ? `/products/${product.id}` : "/products"} variant="quiet">
                إلغاء
              </ButtonLink>
              <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
                {save.isPending && <Spinner />}
                {editing ? "احفظ وابعت للمراجعة" : "ابعت للمراجعة"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ step, children }: { step: number; children: React.ReactNode }) {
  const s = STEPS[step]!;
  return (
    <m.section
      id={s.id}
      data-step={s.id}
      aria-labelledby={`${s.id}-title`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-primary text-body font-extrabold text-accent-text tabular-nums">
          {(step + 1).toLocaleString("ar-EG")}
        </span>
        <div>
          <h2 id={`${s.id}-title`} className="text-title font-extrabold">
            {s.title}
          </h2>
          <p className="text-body-sm text-ink-2">{s.body}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-image-lg border border-line bg-surface p-5 sm:p-7">{children}</div>
    </m.section>
  );
}

/** Desktop step rail: follows the scroll, and jumps to a section on click. */
function StepRail() {
  const [active, setActive] = useState<string>(STEPS[0].id);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive((visible.target as HTMLElement).dataset.step ?? STEPS[0].id);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    document.querySelectorAll("[data-step]").forEach((el) => observer.current?.observe(el));
    return () => observer.current?.disconnect();
  }, []);

  return (
    <nav aria-label="خطوات القطعة" className="hidden lg:block">
      <ol className="sticky top-24 flex flex-col gap-1 border-s-[1.5px] border-dashed border-line-strong">
        {STEPS.map((s, i) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="relative">
              {on && <m.span layoutId="step-thread" aria-hidden="true" className="absolute -start-[1.5px] inset-y-1 w-[3px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
              <a href={`#${s.id}`} aria-current={on ? "step" : undefined} className={`flex min-h-11 items-center gap-2 ps-5 text-body-sm transition-colors duration-quick ${on ? "font-extrabold text-ink" : "font-semibold text-ink-3 hover:text-ink"}`}>
                <span className="tabular-nums">{(i + 1).toLocaleString("ar-EG")}</span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
