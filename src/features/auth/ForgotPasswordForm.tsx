"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ApiError, authApi } from "@/lib/client/api";
import { normalizeDigits, normalizePhone } from "@/lib/phone";
import { MSG, otp, phone, strongPassword } from "@/lib/validation";
import { useForm } from "@/hooks/useForm";
import { E, track } from "@/lib/observability/analytics";

const RESEND_SECONDS = 60;

const PHONE_CHECKS = { phone };
const RESET_CHECKS = {
  code: otp,
  newPassword: strongPassword,
  confirm: (v: string, all: Record<"code" | "newPassword" | "confirm", string>) => (!v ? MSG.required : v === all.newPassword ? null : MSG.mismatch),
};

/** The app's two-step reset: phone, then the 6-digit code with a new password. */
export function ForgotPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const phoneForm = useForm({ phone: "" }, PHONE_CHECKS);
  const resetForm = useForm({ code: "", newPassword: "", confirm: "" }, RESET_CHECKS);
  const number = normalizePhone(phoneForm.values.phone);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  async function run(job: () => Promise<void>) {
    if (busy) return;
    setProblem(null);
    setBusy(true);
    try {
      await job();
    } catch (error) {
      if (error instanceof ApiError && (phoneForm.setServerErrors(error.fields) || resetForm.setServerErrors(error.fields))) return;
      setProblem(error instanceof Error ? error.message : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      await authApi.requestReset(number);
      setStep("reset");
      setWait(RESEND_SECONDS);
      toast.show("بعتنالك كود التحقق بنجاح!");
    });

  const reset = () =>
    run(async () => {
      await authApi.resetPassword({ phone: number, code: normalizeDigits(resetForm.values.code).trim(), newPassword: resetForm.values.newPassword });
      track(E.FORGOT_PASSWORD_USED);
      toast.show("تم تغيير كلمة السر بنجاح، سجل دخول بكلمة السر الجديدة");
      router.replace("/login");
    });

  return (
    <>
      <Link href="/login" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-body-sm font-bold text-ink-2 hover:text-ink">
        <ArrowRight className="size-4" aria-hidden="true" />
        رجوع لتسجيل الدخول
      </Link>
      <p className="text-meta font-bold text-accent-text">ولا يهمك</p>
      <h1 className="mt-1 text-headline font-extrabold">استرجاع كلمة السر</h1>
      <p className="mt-2 text-body text-ink-2" aria-live="polite">
        {step === "phone" ? "اكتب رقم موبايلك المسجل وهنبعتلك كود تحقق عشان تقدر تغيّر كلمة السر" : (
          <>
            بعتنا الكود على <bdi dir="ltr">{number}</bdi>. اكتب الكود اللي وصلك وكلمة السر الجديدة.
          </>
        )}
      </p>

      {problem && (
        <p role="alert" className="mt-6 flex items-start gap-2.5 rounded-control bg-error-container p-3.5 text-body-sm font-semibold text-error">
          <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {problem}
        </p>
      )}

      {step === "phone" ? (
        <form
          noValidate
          className="mt-8 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneForm.validate()) void sendCode();
          }}
        >
          <TextField id="phone" label="رقم الموبايل" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01xxxxxxxxx" className="text-start" maxLength={16} {...phoneForm.field("phone")} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Spinner />}
            ابعت الكود
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="page-enter mt-8 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (resetForm.validate()) void reset();
          }}
        >
          <TextField id="code" label="كود التحقق (OTP)" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="text-center tracking-[0.5em]" {...resetForm.field("code")} />
          <PasswordField id="newPassword" label="كلمة السر الجديدة" autoComplete="new-password" maxLength={128} hint="8 حروف على الأقل، فيها حرف كبير وصغير ورقم ورمز زي @ أو !" {...resetForm.field("newPassword")} />
          <PasswordField id="confirm" label="تأكيد كلمة السر" autoComplete="new-password" maxLength={128} {...resetForm.field("confirm")} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Spinner />}
            تغيير كلمة السر
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
            <button type="button" disabled={wait > 0 || busy} onClick={() => void sendCode()} className="min-h-11 font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-4 disabled:text-ink-3 disabled:no-underline">
              {wait > 0 ? `تقدر تطلب الكود تاني بعد ${wait} ثانية` : "ابعت الكود تاني"}
            </button>
            <button type="button" onClick={() => setStep("phone")} className="min-h-11 font-bold text-ink-2 hover:text-ink">
              تغيير رقم الموبايل
            </button>
          </div>
        </form>
      )}
    </>
  );
}
