"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { ConfirmDialog, Spinner } from "@/components/ui/ConfirmDialog";
import { ApiError, api, authApi } from "@/lib/client/api";
import { normalizePhone } from "@/lib/phone";
import { phone, required } from "@/lib/validation";
import { useForm } from "@/hooks/useForm";
import type { Seller } from "@/lib/types";
import { SELLER_KEY, deletionPending, homeFor, useSeller } from "./session";

/** Only same-site paths are honoured as a return address after signing in. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : null;
}

const CHECKS = { phone, password: required };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const { data: current } = useSeller();
  const form = useForm({ phone: "", password: "" }, CHECKS);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Seller | null>(null);
  const [reactivating, setReactivating] = useState(false);
  // The dialog also reports "closed" after a successful reactivation; only a real refusal signs out.
  const reactivated = useRef(false);

  const enter = (seller: Seller) => {
    client.setQueryData(SELLER_KEY, seller);
    const home = homeFor(seller);
    router.replace(home === "/" ? (safeNext(params.get("next")) ?? "/") : home);
  };

  // Already signed in (another tab, or the back button): go straight in.
  useEffect(() => {
    if (current && !pendingDeletion && !busy) router.replace(homeFor(current));
  }, [current, pendingDeletion, busy, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    if (!form.validate()) return;
    setBusy(true);
    try {
      const seller = await authApi.login({ phone: normalizePhone(form.values.phone), password: form.values.password });
      if (deletionPending(seller)) setPendingDeletion(seller);
      else enter(seller);
    } catch (error) {
      if (error instanceof ApiError && form.setServerErrors(error.fields)) return;
      setProblem(error instanceof Error ? error.message : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    setReactivating(true);
    try {
      const seller = await api.post<Seller>("/auth/seller/account/reactivate");
      reactivated.current = true;
      setPendingDeletion(null);
      enter(seller);
    } catch (error) {
      reactivated.current = true;
      setPendingDeletion(null);
      setProblem(error instanceof Error ? error.message : "حصلت مشكلة. جرّب تاني.");
    } finally {
      setReactivating(false);
    }
  }

  async function keepDeletion() {
    if (reactivated.current) {
      reactivated.current = false;
      return;
    }
    setPendingDeletion(null);
    await authApi.logout().catch(() => undefined);
    client.setQueryData(SELLER_KEY, null);
  }

  return (
    <>
      <p className="enter text-meta font-bold text-accent-text" style={{ "--i": 0 } as React.CSSProperties}>
        أهلاً بيك تاني
      </p>
      <h1 className="enter mt-1 text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
        ادخل ورشتك
      </h1>
      <p className="enter mt-2 text-body text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>
        رقم موبايلك وكلمة السر، وكمّل من مكان ما وقفت.
      </p>

      <form noValidate onSubmit={submit} className="mt-8 flex flex-col gap-5" aria-busy={busy}>
        {problem && (
          <p role="alert" className="flex items-start gap-2.5 rounded-control bg-error-container p-3.5 text-body-sm font-semibold text-error">
            <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {problem}
          </p>
        )}
        <div className="enter" style={{ "--i": 3 } as React.CSSProperties}>
          <TextField id="phone" label="رقم الموبايل" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01xxxxxxxxx" className="text-start" maxLength={16} {...form.field("phone")} />
        </div>
        <div className="enter" style={{ "--i": 4 } as React.CSSProperties}>
          <PasswordField id="password" label="كلمة السر" autoComplete="current-password" placeholder="كلمة السر بتاعتك" maxLength={128} {...form.field("password")} />
          <Link href="/forgot-password" className="mt-2 inline-flex min-h-11 items-center text-body-sm font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-primary">
            نسيت كلمة السر؟
          </Link>
        </div>
        <Button type="submit" disabled={busy} className="enter mt-1 w-full" style={{ "--i": 5 } as React.CSSProperties}>
          {busy && <Spinner />}
          {busy ? "بندخّلك..." : "دخول"}
        </Button>
      </form>

      <p className="mt-8 text-body-sm text-ink-2">
        لسه معندكش متجر؟{" "}
        <Link href="/register" className="font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-primary">
          افتح متجرك
        </Link>
      </p>

      <ConfirmDialog
        open={Boolean(pendingDeletion)}
        onClose={keepDeletion}
        onConfirm={reactivate}
        busy={reactivating}
        title="حسابك في انتظار الحذف"
        body="طلبت حذف حسابك قبل كده، وهيتحذف نهائيًا لو محدش سجل دخول خلال المدة المتبقية. عايز ترجّع حسابك تاني وتكمل بيع؟"
        confirmLabel="أيوة، رجّع حسابي"
        cancelLabel="لأ، خليه يتحذف"
      />
    </>
  );
}
