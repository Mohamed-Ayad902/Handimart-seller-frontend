"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { m } from "motion/react";
import { ArrowRight, CaretLeft, Check, ImageSquare, MapPin, UploadSimple } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { useForm } from "@/hooks/useForm";
import { ApiError } from "@/lib/client/api";
import type { RegionItem, Seller, StoreRequest } from "@/lib/types";
import { optionalUrl, text } from "@/lib/validation";
import { useSeller } from "@/features/auth/session";
import { MEDIA_MSG, UPLOAD_BUDGET, compressImage, formatMB } from "@/features/products/media";
import { useRegions, useSaveStore, useStoreCategories } from "./api";

type Field = "name" | "description" | "detailedAddress" | "fbPage" | "instaPage" | "website";

const SOCIAL: { key: "fbPage" | "instaPage" | "website"; label: string; placeholder: string }[] = [
  { key: "fbPage", label: "فيسبوك", placeholder: "https://facebook.com/..." },
  { key: "instaPage", label: "إنستجرام", placeholder: "https://instagram.com/..." },
  { key: "website", label: "موقعك الإلكتروني", placeholder: "https://www.mystore.com" },
];
const NEED_SOCIAL = "حط رابط واحد على الأقل";

/**
 * The app's checks (EditStoreInfoViewModel.submit), with the backend's own floor for the
 * description (`StoreRequest`: at least 20 characters) so the seller hears it here first.
 */
const CHECKS = {
  name: text({ min: 1, max: 50 }),
  description: text({ min: 20, max: 1000 }),
  detailedAddress: text({ min: 1, max: 1000 }),
  fbPage: (v: string, all: Record<Field, string>) => (hasSocial(all) ? optionalUrl(v) : NEED_SOCIAL),
  instaPage: (v: string, all: Record<Field, string>) => (hasSocial(all) ? optionalUrl(v) : NEED_SOCIAL),
  website: (v: string, all: Record<Field, string>) => (hasSocial(all) ? optionalUrl(v) : NEED_SOCIAL),
};

function hasSocial(v: Record<Field, string>) {
  return [v.fbPage, v.instaPage, v.website].some((x) => x.trim());
}

/** Backend field names to this form's, for server-side validation messages. */
const SERVER_FIELDS: Record<string, Field> = { name: "name", description: "description", "location.detailedAddress": "detailedAddress", fbPage: "fbPage", instaPage: "instaPage", website: "website" };

export function StoreForm() {
  const seller = useSeller();
  if (seller.isPending)
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="بنحمّل بيانات المتجر">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  if (seller.isError || !seller.data?.store) return <StateView illustration="tangledThread" title="معرفناش نجيب بيانات متجرك" action={<Button onClick={() => seller.refetch()}>حاول مرة أخرى</Button>} />;
  return <Form seller={seller.data} />;
}

interface Picked {
  file: File;
  preview: string;
}

function Form({ seller }: { seller: Seller }) {
  const store = seller.store!;
  const router = useRouter();
  const toast = useToast();
  const save = useSaveStore();
  const categories = useStoreCategories();

  const form = useForm<Field>(
    {
      name: store.name ?? "",
      description: store.description ?? "",
      detailedAddress: store.location?.detailedAddress ?? "",
      fbPage: store.fbPage ?? "",
      instaPage: store.instaPage ?? "",
      website: store.website ?? "",
    },
    CHECKS,
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(() => store.categories?.map((c) => c.id) ?? []);
  const [path, setPath] = useState<RegionItem[]>(() => store.regionPath ?? (store.region ? [store.region] : []));
  const [logo, setLogo] = useState<Picked | null>(null);
  const [banner, setBanner] = useState<Picked | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(false);

  const region = path.at(-1) ?? null;
  // A region is only valid once drilled down to a leaf, as in the app's picker.
  const regionError = submitted && !region ? (store.location?.city && !store.region ? "المنطقة دي مكتوبة بالطريقة القديمة، اختارها تاني من القائمة" : "اختار منطقة المتجر من القائمة") : null;
  const categoryError = submitted && categoryIds.length === 0 ? "اختار قسم واحد على الأقل" : null;
  const logoError = submitted && !logo && !store.logoUrl ? "ضيف لوجو لمتجرك" : null;
  const imageBytes = (logo?.file.size ?? 0) + (banner?.file.size ?? 0);

  useEffect(() => {
    if (!dirty || save.isSuccess) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, save.isSuccess]);

  useEffect(() => () => [logo, banner].forEach((p) => p && URL.revokeObjectURL(p.preview)), [logo, banner]);

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);
    const ok = form.validate();
    if (!ok || !region || categoryIds.length === 0 || (!logo && !store.logoUrl)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.focus());
      return;
    }
    if (imageBytes > UPLOAD_BUDGET) return setFailure(MEDIA_MSG.budget);
    const v = form.values;
    const clean = (s: string) => s.trim() || null;
    const body: StoreRequest = {
      name: v.name.trim(),
      description: v.description.trim(),
      fbPage: clean(v.fbPage),
      instaPage: clean(v.instaPage),
      website: clean(v.website),
      // The app sends the picked area line as the legacy city text, next to the canonical region.
      location: { city: path.map((r) => r.name).join(" › "), detailedAddress: v.detailedAddress.trim() },
      categoryIds,
      regionId: region.id,
    };
    save.mutate(
      { body, logo: logo?.file ?? null, banner: banner?.file ?? null },
      {
        onSuccess: () => {
          toast.show("اتحفظت بيانات متجرك");
          router.push("/store");
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            const mapped = Object.fromEntries(Object.entries(err.fields).flatMap(([k, msg]) => (SERVER_FIELDS[k] ? [[SERVER_FIELDS[k], msg]] : [])));
            form.setServerErrors(mapped);
            setFailure(err.status === 413 ? MEDIA_MSG.budget : err.message);
          } else setFailure("حصلت مشكلة وإحنا بنحفظ بيانات المتجر. جرّب تاني.");
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/store" className="group inline-flex w-fit min-h-11 items-center gap-1.5 text-body-sm font-bold text-ink-2 hover:text-ink">
          <ArrowRight className="size-4 transition-transform duration-standard ease-soft group-hover:translate-x-1" aria-hidden="true" />
          متجري
        </Link>
        <h1 className="enter text-headline font-extrabold">عدّل بيانات متجرك</h1>
        <p className="text-body text-ink-2">ده اللي العملاء بيشوفوه لما يدخلوا متجرك.</p>
      </header>

      <Section index={0} title="واجهة متجرك" body="كده هيشوفك العملاء.">
        <div className="relative">
          <ImageSlot
            kind="banner"
            label="صورة الغلاف"
            current={banner?.preview ?? store.bannerUrl}
            local={!!banner}
            onPick={(p) => {
              setDirty(true);
              setBanner(p);
            }}
          />
          <div className="relative -mt-10 ps-4 sm:-mt-12 sm:ps-5">
            <ImageSlot
              kind="logo"
              label="اللوجو"
              current={logo?.preview ?? store.logoUrl}
              local={!!logo}
              error={logoError}
              onPick={(p) => {
                setDirty(true);
                setLogo(p);
              }}
            />
          </div>
        </div>
        {imageBytes > 0 && (
          <p className="text-meta tabular-nums text-ink-3">
            حجم الصور الجديدة {formatMB(imageBytes)} من {formatMB(UPLOAD_BUDGET)}
          </p>
        )}
      </Section>

      <Section index={1} title="عن متجرك" body="اسم يفتكروه، ووصف يقول بتعمل إيه.">
        <TextField id="name" label="اسم المتجر" maxLength={50} placeholder="اكتب اسم متجرك المميز" {...field("name")} />
        <TextArea id="description" label="وصف المتجر (إيه المنتجات اللي بتقدمها؟)" maxLength={1000} rows={5} placeholder="اكتب تفاصيل منتجاتك والقطع المميزة اللي بتعملها..." {...field("description")} />
        <p className="-mt-3 text-end text-meta tabular-nums text-ink-3">{form.values.description.trim().length.toLocaleString("ar-EG")} / ١٠٠٠</p>

        <fieldset className="flex flex-col gap-3" aria-describedby={categoryError ? "categories-error" : undefined}>
          <legend className="mb-2 text-meta font-bold text-ink-2">أقسام منتجاتك</legend>
          {categories.isPending ? (
            <div className="flex flex-wrap gap-2" aria-label="بنحمّل الأقسام">
              {["w-28", "w-20", "w-24", "w-32", "w-20"].map((w, i) => (
                <Skeleton key={i} className={`h-11 rounded-full ${w}`} />
              ))}
            </div>
          ) : categories.isError ? (
            <p role="alert" className="text-body-sm font-semibold text-error">
              معرفناش نجيب الأقسام.{" "}
              <button type="button" className="underline" onClick={() => categories.refetch()}>
                جرّب تاني
              </button>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(categories.data ?? []).map((c) => {
                const on = categoryIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    data-invalid={categoryError ? "true" : undefined}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-body-sm font-bold transition-[border-color,background-color,color] duration-quick has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                      on ? "border-ink bg-ink text-paper" : categoryError ? "border-error text-ink" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => {
                        setDirty(true);
                        setCategoryIds((list) => (on ? list.filter((x) => x !== c.id) : [...list, c.id]));
                      }}
                    />
                    {on && <Check className="size-4" weight="bold" aria-hidden="true" />}
                    {c.name}
                  </label>
                );
              })}
            </div>
          )}
          {categoryError && (
            <p id="categories-error" className="text-meta font-semibold text-error">
              {categoryError}
            </p>
          )}
        </fieldset>
      </Section>

      <Section index={2} title="منين بتشحن" body="المنطقة بتحدد مين يقدر يطلب منك وتكلفة التوصيل.">
        <div className="flex flex-col gap-1.5">
          <span id="region-label" className="text-meta font-bold text-ink-2">
            منطقة المتجر
          </span>
          <button
            type="button"
            aria-labelledby="region-label region-value"
            data-invalid={regionError ? "true" : undefined}
            aria-describedby={regionError ? "region-error" : undefined}
            onClick={() => setPicking(true)}
            className={`group flex min-h-12 items-center gap-3 rounded-control border bg-surface px-3.5 text-start transition-colors duration-quick hover:border-ink ${regionError ? "border-error" : "border-line-strong"}`}
          >
            <MapPin className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
            <span id="region-value" className={`min-w-0 flex-1 truncate text-body ${region ? "text-ink" : "text-ink-3"}`}>
              {region ? path.map((r) => r.name).join(" › ") : "اختار المحافظة والمنطقة"}
            </span>
            <CaretLeft className="size-4 text-ink-3 transition-transform duration-standard ease-soft group-hover:-translate-x-1" aria-hidden="true" />
          </button>
          {regionError && (
            <p id="region-error" className="text-meta font-semibold text-error">
              {regionError}
            </p>
          )}
        </div>
        <TextField id="detailedAddress" label="العنوان بالتفصيل" maxLength={1000} placeholder="اسم الشارع، رقم العمارة، الدور" {...field("detailedAddress")} />
      </Section>

      <Section index={3} title="روابط السوشيال ميديا" body="حط رابط واحد على الأقل، عشان العملاء يتأكدوا من شغلك.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {SOCIAL.map((s) => (
            <TextField key={s.key} id={s.key} label={s.label} type="url" inputMode="url" dir="ltr" className="text-start" placeholder={s.placeholder} autoComplete="url" {...field(s.key)} />
          ))}
        </div>
      </Section>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-image-lg border border-line bg-surface/95 p-4 shadow-[0_12px_40px_-20px_rgb(42_19_48/0.35)] backdrop-blur sm:flex-row sm:items-center sm:justify-between md:bottom-4">
        <p className="text-body-sm text-ink-2" aria-live="polite">
          {failure ? (
            <span role="alert" className="font-semibold text-error">
              {failure}
            </span>
          ) : save.isPending ? (
            "بنحفظ بيانات المتجر..."
          ) : (
            "التعديلات بتظهر للعملاء على طول."
          )}
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/store" variant="quiet">
            إلغاء
          </ButtonLink>
          <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending && <Spinner />}
            احفظ التعديلات
          </Button>
        </div>
      </div>

      <RegionPicker
        open={picking}
        initial={path}
        onClose={() => setPicking(false)}
        onPick={(next) => {
          setDirty(true);
          setPath(next);
          setPicking(false);
        }}
      />
    </form>
  );
}

function Section({ index, title, body, children }: { index: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-label={title}
      className="flex flex-col gap-6"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-primary text-body font-extrabold text-accent-text tabular-nums">
          {(index + 1).toLocaleString("ar-EG")}
        </span>
        <div>
          <h2 className="text-title font-extrabold">{title}</h2>
          <p className="text-body-sm text-ink-2">{body}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-image-lg border border-line bg-surface p-5 sm:p-7">{children}</div>
    </m.section>
  );
}

/** One image (logo or banner): shows the current one, compresses a new pick in the browser. */
function ImageSlot({ kind, label, current, local, error, onPick }: { kind: "logo" | "banner"; label: string; current: string | null | undefined; local: boolean; error?: string | null; onPick: (p: Picked) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shown = problem ?? error ?? null;

  const pick = async (file: File | undefined) => {
    setProblem(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setProblem("استخدم صورة JPG أو PNG أو WebP.");
    setBusy(true);
    try {
      const ready = await compressImage(file).catch(() => null);
      if (!ready) return setProblem(MEDIA_MSG.broken);
      onPick({ file: ready, preview: URL.createObjectURL(ready) });
    } finally {
      setBusy(false);
    }
  };

  const isLogo = kind === "logo";
  return (
    <div className={isLogo ? "flex items-end gap-3" : ""}>
      <label
        htmlFor={id}
        data-invalid={shown ? "true" : undefined}
        className={`group relative block cursor-pointer overflow-hidden bg-surface-sunken has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
          isLogo ? `size-24 shrink-0 rounded-full border-4 ${shown ? "border-error" : "border-surface"}` : "aspect-[5/2] w-full rounded-image sm:aspect-[4/1]"
        }`}
      >
        {current ? (
          local ? (
            // A fresh pick is a blob: URL, which the image optimiser can't fetch.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="size-full object-cover" />
          ) : (
            <Image src={current} alt="" fill sizes={isLogo ? "96px" : "(min-width: 1024px) 48rem, 100vw"} className="object-cover" />
          )
        ) : (
          <span className="absolute inset-0 grid place-items-center text-ink-3">
            <ImageSquare className="size-8" aria-hidden="true" />
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-secondary/55 text-on-secondary opacity-0 transition-opacity duration-quick group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
          <UploadSimple className="size-6" aria-hidden="true" />
        </span>
        {busy && <span className="absolute inset-0 grid place-items-center bg-secondary/55 text-on-secondary"><Spinner className="size-6" /></span>}
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} aria-label={`غيّر ${label}`} onChange={(e) => void pick(e.target.files?.[0])} />
      </label>
      {isLogo && (
        <div className="pb-1">
          <p className="text-meta font-bold text-ink-2">{label}</p>
          {shown ? <p role="alert" className="text-meta font-semibold text-error">{shown}</p> : <p className="text-meta text-ink-3">دوس على الصور عشان تغيّرها.</p>}
        </div>
      )}
      {!isLogo && problem && <p role="alert" className="mt-2 text-meta font-semibold text-error">{problem}</p>}
    </div>
  );
}

/** Governorate → city → area, one level at a time; only a level with no children can be picked. */
function RegionPicker({ open, initial, onClose, onPick }: { open: boolean; initial: RegionItem[]; onClose: () => void; onPick: (path: RegionItem[]) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="منطقة المتجر">
      <RegionLevels initial={initial} onPick={onPick} />
    </Dialog>
  );
}

function RegionLevels({ initial, onPick }: { initial: RegionItem[]; onPick: (path: RegionItem[]) => void }) {
  // Opens on the level of the current pick, so changing the area doesn't start from the top.
  const [trail, setTrail] = useState<RegionItem[]>(() => initial.slice(0, -1));
  const parent = trail.at(-1) ?? null;
  const level = useRegions(parent?.id ?? null);
  const chosen = initial.at(-1)?.id;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="المستوى" className="flex flex-wrap items-center gap-1 text-body-sm">
        <button type="button" onClick={() => setTrail([])} className={`min-h-9 rounded-full px-2.5 font-bold ${trail.length ? "text-ink-2 hover:bg-surface-sunken" : "bg-surface-sunken text-ink"}`}>
          المحافظات
        </button>
        {trail.map((r, i) => (
          <span key={r.id} className="flex items-center gap-1">
            <CaretLeft className="size-3.5 text-ink-3" aria-hidden="true" />
            <button type="button" onClick={() => setTrail(trail.slice(0, i + 1))} aria-current={i === trail.length - 1 ? "location" : undefined} className={`min-h-9 rounded-full px-2.5 font-bold ${i === trail.length - 1 ? "bg-surface-sunken text-ink" : "text-ink-2 hover:bg-surface-sunken"}`}>
              {r.name}
            </button>
          </span>
        ))}
      </nav>

      {level.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="بنحمّل المناطق">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : level.isError ? (
        <p role="alert" className="text-body-sm font-semibold text-error">
          معرفناش نجيب المناطق.{" "}
          <button type="button" className="underline" onClick={() => level.refetch()}>
            جرّب تاني
          </button>
        </p>
      ) : !level.data?.length ? (
        <p className="text-body-sm text-ink-2">مفيش مناطق هنا لسه.</p>
      ) : (
        <ul className="divide-y divide-dashed divide-line overflow-hidden rounded-image border border-line">
          {level.data.map((r) => {
            const drills = r.hasChildren === true;
            const selected = r.id === chosen;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => (drills ? setTrail([...trail, r]) : onPick([...trail, r]))}
                  aria-pressed={drills ? undefined : selected}
                  className="group flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start transition-colors duration-quick hover:bg-paper"
                >
                  <span className="min-w-0 flex-1 text-body font-semibold">{r.name}</span>
                  {drills ? (
                    <CaretLeft className="size-4 text-ink-3 transition-transform duration-standard ease-soft group-hover:-translate-x-1" aria-hidden="true" />
                  ) : selected ? (
                    <Check className="size-5 text-accent-text" weight="bold" aria-label="المختارة" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
