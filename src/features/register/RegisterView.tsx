"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CaretLeft, Check, IdentificationCard, ImageSquare, PaperPlaneTilt, SignOut, Storefront, UploadSimple, UserCircle, WarningCircle } from "@phosphor-icons/react";
import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useForm } from "@/hooks/useForm";
import { ApiError, api, authApi, upload } from "@/lib/client/api";
import { normalizeDigits, normalizePhone } from "@/lib/phone";
import type { Seller } from "@/lib/types";
import { MSG, email, otp, phone, strongPassword, text } from "@/lib/validation";
import { AuthShell } from "@/features/auth/AuthShell";
import { SELLER_KEY, homeFor, useLogout, useSeller } from "@/features/auth/session";
import { MEDIA_MSG, UPLOAD_BUDGET, compressImage } from "@/features/products/media";
import { StoreForm } from "@/features/store/StoreForm";
import { REASONS } from "@/features/account-status/reasons";
import { E, track } from "@/lib/observability/analytics";

type Step = "personal" | "documents" | "store" | "otp" | "send";

const STEPS: { key: Step; label: string }[] = [
  { key: "personal", label: "بياناتك" },
  { key: "documents", label: "البطاقة" },
  { key: "store", label: "المتجر" },
  { key: "otp", label: "تأكيد الرقم" },
];

/** A rejected application: the same three steps, every one open, then sending it back for review. */
const FIX_STEPS: { key: Step; label: string }[] = [...STEPS.slice(0, 3), { key: "send", label: "ابعته" }];

/** The step the team's reason points at, so a rejected seller lands on what needs fixing. */
function fixAt(seller: Seller): Step {
  switch (seller.rejectionReason) {
    case "INVALID_DOCUMENTS":
      return "documents";
    case "LOW_QUALITY_STORE_ASSETS":
    case "STORE_POLICY_VIOLATION":
      return "store";
    default:
      return "personal";
  }
}

/** Who may be here: a draft account finishing sign-up, or a rejected one fixing its application. */
const canRegister = (seller: Seller) => seller.accountStatus === "ONBOARDING" || seller.accountStatus === "REJECTED";

/** Where an onboarding seller picks up, from the backend's `registrationStatus` (app `RegistrationStateMapper`). */
function resumeAt(seller: Seller): Step {
  switch (seller.registrationStatus) {
    case "COMPLETED_PERSONAL_INFO":
      return "documents";
    case "COMPLETED_DOCUMENTS_INFO":
      return "store";
    case "COMPLETED_STORE_INFO":
    case "REQUESTED_OTP":
    case "COMPLETED_OTP":
      return "otp";
    default:
      return "personal";
  }
}

/**
 * Signing up as a new seller (the app's RegisterUserScreen): an account first (phone and
 * password, which signs the draft account in), then personal info, ID photos, the store and the
 * phone code. Every step is saved on the server, so the seller can leave and come back to it.
 * A rejected seller comes back here too, edits what the team flagged and sends it for review again.
 */
export function RegisterView() {
  const router = useRouter();
  const { data: seller, isPending } = useSeller();

  useEffect(() => {
    if (seller && !canRegister(seller)) router.replace(homeFor(seller));
  }, [seller, router]);

  if (isPending || (seller && !canRegister(seller)))
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!seller)
    return (
      <AuthShell line="افتح ورشتك أونلاين">
        <AccountStep />
      </AuthShell>
    );
  return <Wizard key={seller.user?.id ?? "seller"} seller={seller} />;
}

const ACCOUNT_CHECKS = {
  phone,
  password: strongPassword,
  confirm: (v: string, all: Record<"phone" | "password" | "confirm", string>) => (!v ? MSG.required : v === all.password ? null : MSG.mismatch),
};

function AccountStep() {
  const client = useQueryClient();
  const form = useForm({ phone: "", password: "", confirm: "" }, ACCOUNT_CHECKS);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    if (!form.validate()) return;
    setBusy(true);
    const input = { phone: normalizePhone(form.values.phone), password: form.values.password };
    try {
      let seller: Seller;
      try {
        seller = await authApi.register(input);
        track(E.SIGN_UP, { method: "phone" });
      } catch (error) {
        // The number already has an account (app BasicInfoHandler): sign in and carry on from where it stopped.
        if (error instanceof ApiError && error.status === 409) seller = await authApi.login(input);
        else throw error;
      }
      client.setQueryData(SELLER_KEY, seller);
    } catch (error) {
      if (error instanceof ApiError && form.setServerErrors(error.fields)) return;
      setProblem(error instanceof Error ? error.message : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="enter text-meta font-bold text-accent-text">أهلاً بيك في هانديمارت</p>
      <h1 className="enter mt-1 text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
        افتح متجرك
      </h1>
      <p className="enter mt-2 text-body text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>
        رقم موبايلك وكلمة سر، وبعدها كام خطوة بسيطة ومتجرك يبقى جاهز للمراجعة.
      </p>
      <form noValidate onSubmit={submit} className="mt-8 flex flex-col gap-5" aria-busy={busy}>
        {problem && (
          <p role="alert" className="flex items-start gap-2.5 rounded-control bg-error-container p-3.5 text-body-sm font-semibold text-error">
            <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {problem}
          </p>
        )}
        <TextField id="phone" label="رقم الموبايل" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01xxxxxxxxx" className="text-start" maxLength={16} {...form.field("phone")} />
        <PasswordField id="password" label="كلمة السر" autoComplete="new-password" maxLength={128} hint="8 حروف على الأقل، فيها حرف كبير وصغير ورقم ورمز" {...form.field("password")} />
        <PasswordField id="confirm" label="أكّد كلمة السر" autoComplete="new-password" maxLength={128} {...form.field("confirm")} />
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy && <Spinner />}
          {busy ? "بنجهّز حسابك..." : "يلا نبدأ"}
        </Button>
      </form>
      <p className="mt-8 text-body-sm text-ink-2">
        عندك حساب؟{" "}
        <Link href="/login" className="font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-primary">
          ادخل من هنا
        </Link>
      </p>
    </>
  );
}

function Wizard({ seller }: { seller: Seller }) {
  const client = useQueryClient();
  const router = useRouter();
  const logout = useLogout();
  const fixing = seller.accountStatus === "REJECTED";
  const flow = fixing ? FIX_STEPS : STEPS;
  const reached = fixing ? "send" : resumeAt(seller);
  const [viewing, setViewing] = useState<Step | null>(() => (fixing ? fixAt(seller) : null));
  const step = viewing ?? reached;
  const top = useRef<HTMLDivElement>(null);
  const index = flow.findIndex((s) => s.key === step);

  const toTop = () => top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const saved = (next: Seller) => {
    client.setQueryData(SELLER_KEY, next);
    if (fixing) setViewing(flow[index + 1]?.key ?? "send");
    else {
      setViewing(null);
      if (next.accountStatus && next.accountStatus !== "ONBOARDING") router.replace(homeFor(next));
    }
    toTop();
  };
  /** Fixing: a step with nothing changed just moves on. */
  const skip = () => {
    setViewing(flow[index + 1]?.key ?? "send");
    toTop();
  };

  const reachedIndex = flow.findIndex((s) => s.key === reached);

  return (
    <div ref={top} className="min-h-dvh bg-paper">
      <header className="flex items-center justify-between page-gutter py-4">
        <LogoMark className="h-9 w-auto text-secondary" title="هانديمارت" />
        <Button variant="quiet" className="min-h-11 px-4" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <SignOut className="size-5" aria-hidden="true" />
          كمّل بعدين
        </Button>
      </header>
      <main id="main" className={`mx-auto flex w-full flex-col gap-8 px-5 pb-16 ${step === "store" ? "max-w-4xl" : "max-w-xl"}`}>
        {fixing && <FixNotes seller={seller} />}
        <nav aria-label={fixing ? "خطوات تعديل الطلب" : "خطوات التسجيل"}>
          <ol className="flex items-center">
            {flow.map((s, i) => {
              const done = fixing ? i < index : i < reachedIndex;
              const current = i === index;
              const canOpen = i <= reachedIndex && s.key !== "otp" && !current;
              const dot = (
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-meta font-extrabold tabular-nums transition-colors duration-standard ${
                    current ? "border-primary bg-primary text-on-primary" : done ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-3"
                  }`}
                >
                  {done && !current ? <Check weight="bold" className="size-4" aria-hidden="true" /> : (i + 1).toLocaleString("ar-EG")}
                </span>
              );
              return (
                <li key={s.key} className="flex flex-1 items-center gap-2 last:flex-none">
                  {canOpen ? (
                    <button type="button" onClick={() => setViewing(s.key)} className="flex items-center gap-2 rounded-full" aria-label={`ارجع لخطوة ${s.label}`}>
                      {dot}
                      <span className="text-meta font-bold max-sm:sr-only">{s.label}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
                      {dot}
                      <span className={`text-meta font-bold max-sm:sr-only ${current ? "text-ink" : "text-ink-3"}`}>{s.label}</span>
                    </span>
                  )}
                  {i < flow.length - 1 && <span aria-hidden="true" className={`mx-1 h-0.5 flex-1 ${done ? "bg-ink" : "bg-[repeating-linear-gradient(to_left,var(--hm-border-strong)_0_6px,transparent_6px_11px)]"}`} />}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-meta text-ink-3 sm:hidden">
            خطوة {(index + 1).toLocaleString("ar-EG")} من {flow.length.toLocaleString("ar-EG")}: {flow[index]!.label}
          </p>
        </nav>

        <div key={step} className="page-enter">
          {step === "personal" && <PersonalStep seller={seller} fixing={fixing} onSaved={saved} />}
          {step === "documents" && <DocumentsStep seller={seller} fixing={fixing} onSaved={saved} onSkip={skip} />}
          {step === "store" && <StoreForm register={{ onSaved: saved, hint: fixing ? "بعدها تراجع طلبك وتبعته للمراجعة تاني." : undefined }} />}
          {step === "otp" && <OtpStep seller={seller} onSaved={saved} />}
          {step === "send" && <SendStep onOpen={(s) => { setViewing(s); toTop(); }} />}
        </div>
      </main>
    </div>
  );
}

interface Picked {
  file: File;
  preview: string;
}

/** One photo slot: compresses the pick in the browser and shows it. */
function PhotoSlot({ label, hint, current, picked, error, round = false, onPick }: { label: string; hint?: string; current?: string | null; picked: Picked | null; error?: string | null; round?: boolean; onPick: (p: Picked) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shown = problem ?? error ?? null;
  const src = picked?.preview ?? current ?? null;

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

  return (
    <div className={`flex flex-col gap-2 ${round ? "items-center" : ""}`}>
      <label
        htmlFor={id}
        data-invalid={shown ? "true" : undefined}
        className={`group relative grid cursor-pointer place-items-center overflow-hidden border-[1.5px] border-dashed bg-surface transition-colors duration-quick hover:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
          round ? "size-28 rounded-full" : "aspect-[8/5] w-full rounded-image"
        } ${shown ? "border-error" : "border-line-strong"}`}
      >
        {src ? (
          // Local picks are blob: URLs, which the image optimiser can't fetch.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 p-3 text-center text-ink-3">
            {round ? <UserCircle className="size-10" aria-hidden="true" /> : <ImageSquare className="size-9" aria-hidden="true" />}
            {!round && <span className="text-meta font-bold">دوس عشان ترفع الصورة</span>}
          </span>
        )}
        {src && (
          <span className="absolute inset-0 grid place-items-center bg-secondary/55 text-on-secondary opacity-0 transition-opacity duration-quick group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
            <UploadSimple className="size-6" aria-hidden="true" />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-secondary/55 text-on-secondary">
            <Spinner className="size-6" />
          </span>
        )}
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} aria-label={label} onChange={(e) => void pick(e.target.files?.[0])} />
      </label>
      <div className={round ? "text-center" : ""}>
        <p className="text-meta font-bold text-ink-2">{label}</p>
        {shown ? (
          <p role="alert" className="text-meta font-semibold text-error">
            {shown}
          </p>
        ) : (
          hint && <p className="text-meta text-ink-3">{hint}</p>
        )}
      </div>
    </div>
  );
}

function StepHeader({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <header className="mb-6">
      <p className="text-meta font-bold text-accent-text">{kicker}</p>
      <h1 className="text-headline font-extrabold">{title}</h1>
      <p className="mt-1 text-body text-ink-2">{body}</p>
    </header>
  );
}

function Failure({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-control bg-error-container p-3.5 text-body-sm font-semibold text-error">
      <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const PERSONAL_CHECKS = { name: text({ min: 1, max: 50 }), email };

function PersonalStep({ seller, fixing, onSaved }: { seller: Seller; fixing: boolean; onSaved: (s: Seller) => void }) {
  const user = seller.user;
  const form = useForm({ name: user?.displayName ?? "", email: user?.email ?? "" }, PERSONAL_CHECKS);
  const [isMale, setIsMale] = useState<boolean | null>(user?.isMale ?? null);
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const photoError = submitted && !photo && !user?.profilePicUrl ? "ضيف صورة شخصية" : null;
  const genderError = submitted && isMale === null ? "اختار النوع" : null;

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.preview)), [photo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setProblem(null);
    const ok = form.validate();
    if (!ok || isMale === null || (!photo && !user?.profilePicUrl)) return;
    setBusy(true);
    try {
      // Only the three fields the backend reads (handover B3: the app also leaks a local path here).
      const body = { name: form.values.name.trim(), email: form.values.email.trim(), isMale };
      onSaved(await upload<Seller>("/auth/seller/personal-info", body, photo ? [["profilePic", photo.file]] : []));
    } catch (error) {
      if (error instanceof ApiError && form.setServerErrors(error.fields)) return;
      setProblem(error instanceof ApiError ? (error.status === 413 ? MEDIA_MSG.budget : error.message) : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" aria-busy={busy}>
      <StepHeader kicker="خطوة ١" title={fixing ? "راجع بياناتك" : "عرّفنا بنفسك"} body="بياناتك دي للمراجعة بس، ومش بتظهر للعملاء غير اسمك." />
      <div className="flex flex-col gap-5 rounded-image-lg border border-line bg-surface p-5 sm:p-7">
        <div className="flex justify-center">
          <PhotoSlot round label="صورتك الشخصية" current={user?.profilePicUrl} picked={photo} error={photoError} onPick={setPhoto} />
        </div>
        <TextField id="name" label="اسمك" autoComplete="name" maxLength={50} placeholder="الاسم زي ما في البطاقة" {...form.field("name")} />
        <TextField id="email" label="الإيميل" type="email" inputMode="email" autoComplete="email" dir="ltr" className="text-start" placeholder="name@example.com" maxLength={120} {...form.field("email")} />
        <fieldset>
          <legend className="mb-1.5 text-meta font-bold text-ink-2">النوع</legend>
          <div role="radiogroup" className="flex gap-2">
            {[
              { v: true, label: "ذكر" },
              { v: false, label: "أنثى" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={isMale === o.v}
                onClick={() => setIsMale(o.v)}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] px-4 text-body-sm font-bold transition-colors duration-quick ${isMale === o.v ? "border-ink bg-ink text-paper" : genderError ? "border-error" : "border-line-strong hover:border-ink"}`}
              >
                {isMale === o.v && <Check weight="bold" className="size-4" aria-hidden="true" />}
                {o.label}
              </button>
            ))}
          </div>
          {genderError && <p className="mt-1.5 text-meta font-semibold text-error">{genderError}</p>}
        </fieldset>
      </div>
      <Failure message={problem} />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:self-end">
        {busy && <Spinner />}
        احفظ وكمّل
      </Button>
    </form>
  );
}

const DOCS = [
  { key: "frontIdPic", label: "وش البطاقة", hint: "صورة واضحة، كل الكلام مقروء" },
  { key: "backIdPic", label: "ضهر البطاقة", hint: "من غير انعكاس فلاش" },
  { key: "selfieWithIdPic", label: "سيلفي وانت ماسك البطاقة", hint: "وشك والبطاقة باينين" },
] as const;
type DocKey = (typeof DOCS)[number]["key"];

function DocumentsStep({ seller, fixing, onSaved, onSkip }: { seller: Seller; fixing: boolean; onSaved: (s: Seller) => void; onSkip: () => void }) {
  // Fixing: the photos already sent count, and only the ones replaced go up again.
  const sent: Record<DocKey, string | null> = {
    frontIdPic: (fixing && seller.personalDocs?.frontNationalId) || null,
    backIdPic: (fixing && seller.personalDocs?.backNationalId) || null,
    selfieWithIdPic: (fixing && seller.personalDocs?.selfieNationalId) || null,
  };
  const [files, setFiles] = useState<Partial<Record<DocKey, Picked>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => () => Object.values(files).forEach((p) => p && URL.revokeObjectURL(p.preview)), [files]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setProblem(null);
    if (DOCS.some((d) => !files[d.key] && !sent[d.key])) return;
    const parts = DOCS.filter((d) => files[d.key]).map((d) => [d.key, files[d.key]!.file] as [string, File]);
    if (!parts.length) return onSkip();
    setBusy(true);
    try {
      const total = parts.reduce((n, [, f]) => n + f.size, 0);
      // Every part is optional on the backend, so photos that don't fit one request go one at a time (handover R1).
      const batches = total <= UPLOAD_BUDGET ? [parts] : parts.map((p) => [p]);
      let seller: Seller | null = null;
      for (const batch of batches) seller = await upload<Seller>("/auth/seller/documents", {}, batch);
      if (seller) onSaved(seller);
    } catch (error) {
      setProblem(error instanceof ApiError ? (error.status === 413 ? MEDIA_MSG.budget : error.message) : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" aria-busy={busy}>
      <StepHeader
        kicker="خطوة ٢"
        title="صور البطاقة"
        body={fixing ? "غيّر الصورة اللي محتاجة تتعدل بس، والباقي هيفضل زي ما هو." : "عشان نتأكد إن المتجر بتاعك فعلاً. الصور مش بتظهر لحد غير فريق المراجعة."}
      />
      <div className="grid gap-5 rounded-image-lg border border-line bg-surface p-5 sm:grid-cols-2 sm:p-7">
        {DOCS.map((d, i) => (
          <div key={d.key} className={i === 2 ? "sm:col-span-2 sm:mx-auto sm:w-1/2" : undefined}>
            <PhotoSlot label={d.label} hint={d.hint} current={sent[d.key]} picked={files[d.key] ?? null} error={submitted && !files[d.key] && !sent[d.key] ? "الصورة دي مطلوبة" : null} onPick={(p) => setFiles((f) => ({ ...f, [d.key]: p }))} />
          </div>
        ))}
      </div>
      <p className="flex items-start gap-2 text-meta text-ink-3">
        <IdentificationCard className="size-5 shrink-0" aria-hidden="true" />
        البطاقة لازم تكون سارية، والصور واضحة ومن غير قص.
      </p>
      <Failure message={problem} />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:self-end">
        {busy && <Spinner />}
        {busy ? "بنرفع الصور..." : "احفظ وكمّل"}
      </Button>
    </form>
  );
}

/** What the team asked for, kept above every step while the seller fixes the application. */
function FixNotes({ seller }: { seller: Seller }) {
  if (!seller.rejectionReason && !seller.adminComment) return null;
  return (
    <aside aria-label="ملاحظات فريق المراجعة" className="rounded-image-lg bg-error-container/70 p-4 sm:p-5">
      <p className="text-meta font-bold text-ink-2">محتاج يتعدل</p>
      {seller.rejectionReason && <p className="mt-1 text-body-sm font-semibold text-ink">{REASONS[seller.rejectionReason]}</p>}
      {seller.adminComment && <blockquote className="mt-2 border-s-2 border-ink/30 ps-3 text-body-sm whitespace-pre-line text-ink">{seller.adminComment}</blockquote>}
    </aside>
  );
}

const REVIEW_ROWS = [
  { step: "personal", label: "بياناتك", body: "الاسم والإيميل والصورة", icon: UserCircle },
  { step: "documents", label: "صور البطاقة", body: "الوش والضهر والسيلفي", icon: IdentificationCard },
  { step: "store", label: "المتجر", body: "الاسم واللوجو والعنوان والأقسام", icon: Storefront },
] as const;

/** Fixing: a last look, then `auth/seller/resubmit` puts the application back in review. */
function SendStep({ onOpen }: { onOpen: (step: Step) => void }) {
  const client = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function send() {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await api.post("/auth/seller/resubmit");
      track(E.REGISTRATION_RESUBMITTED);
      const next = await authApi.me();
      client.setQueryData(SELLER_KEY, next);
      router.replace(homeFor(next));
    } catch (error) {
      // The backend refuses a resubmit with nothing changed since the rejection, with its own reason.
      setProblem(error instanceof ApiError ? error.message : "حصلت مشكلة. جرّب تاني.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <StepHeader kicker="آخر خطوة" title="ابعت طلبك تاني" body="اتأكد إنك عدّلت اللي الفريق طلبه، وبعدها ابعته. هنراجعه خلال 24 لـ 48 ساعة." />
      <ul className="flex flex-col divide-y divide-line rounded-image-lg border border-line bg-surface">
        {REVIEW_ROWS.map((r) => (
          <li key={r.step}>
            <button type="button" onClick={() => onOpen(r.step)} className="flex min-h-16 w-full items-center gap-4 px-5 py-3 text-start transition-colors duration-quick hover:bg-surface-sunken">
              <r.icon className="size-6 shrink-0 text-ink-2" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-body font-bold">{r.label}</span>
                <span className="block text-meta text-ink-2">{r.body}</span>
              </span>
              <span className="text-meta font-bold text-ink-2">راجع</span>
              <CaretLeft className="size-4 text-ink-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Failure message={problem} />
      <Button onClick={() => void send()} disabled={busy} className="w-full sm:w-auto sm:self-end">
        {busy ? <Spinner /> : <PaperPlaneTilt className="size-5" aria-hidden="true" />}
        ابعت للمراجعة
      </Button>
    </div>
  );
}

const OTP_CHECKS = { code: otp };
const RESEND_AFTER = 60;

function OtpStep({ seller, onSaved }: { seller: Seller; onSaved: (s: Seller) => void }) {
  const client = useQueryClient();
  const form = useForm({ code: "" }, OTP_CHECKS);
  const [wait, setWait] = useState(0);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(seller.registrationStatus === "REQUESTED_OTP");
  const asked = useRef(false);

  const request = async () => {
    setSending(true);
    setProblem(null);
    try {
      const next = await api.post<Seller>("/auth/seller/request-otp");
      if (next) client.setQueryData(SELLER_KEY, next);
      setSent(true);
      setWait(RESEND_AFTER);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : "معرفناش نبعت الكود. جرّب تاني.");
    } finally {
      setSending(false);
    }
  };

  // The code goes out once on arriving here, like the app; after that only on "resend".
  useEffect(() => {
    if (asked.current || seller.registrationStatus === "REQUESTED_OTP") return;
    asked.current = true;
    void request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    if (!form.validate()) return;
    setBusy(true);
    try {
      const next = await api.post<Seller>("/auth/seller/confirm-otp", { code: normalizeDigits(form.values.code).trim() });
      track(E.REGISTRATION_SUBMITTED);
      onSaved(next);
    } catch (error) {
      if (error instanceof ApiError && form.setServerErrors(error.fields)) return;
      setProblem(error instanceof ApiError ? error.message : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" aria-busy={busy}>
      <StepHeader kicker="آخر خطوة" title="أكّد رقم موبايلك" body={`بعتنا كود من 6 أرقام على ${seller.user?.phone ?? "موبايلك"}. اكتبه هنا وطلبك يروح للمراجعة.`} />
      <div className="flex flex-col gap-4 rounded-image-lg border border-line bg-surface p-5 sm:p-7">
        <TextField
          id="code"
          label="كود التحقق"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={6}
          placeholder="••••••"
          className="text-center text-title tracking-[0.5em] tabular-nums"
          {...form.field("code")}
        />
        <p className="text-body-sm text-ink-2" aria-live="polite">
          {sending ? (
            "بنبعت الكود..."
          ) : wait > 0 ? (
            `تقدر تطلب كود جديد بعد ${wait.toLocaleString("ar-EG")} ثانية`
          ) : (
            <>
              {sent ? "موصلكش الكود؟ " : ""}
              <button type="button" onClick={() => void request()} className="font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-primary">
                {sent ? "ابعت كود جديد" : "ابعت الكود"}
              </button>
            </>
          )}
        </p>
      </div>
      <Failure message={problem} />
      <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:self-end">
        {busy && <Spinner />}
        أكّد وابعت للمراجعة
      </Button>
    </form>
  );
}
