"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { m } from "motion/react";
import { CaretLeft, FileText, Gauge, MapPin, PencilSimple, ShieldCheck, SignOut, SunHorizon, Trash, Wallet as WalletIcon, WhatsappLogo, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { formatDate } from "@/lib/format";
import type { PayoutMethod, Seller } from "@/lib/types";
import { numberCheck, parseNumber, text } from "@/lib/validation";
import { deletionPending, useLogout, useSeller } from "@/features/auth/session";
import { useWallet } from "@/features/home/api";
import { PAYOUT, useRequestDeletion, useSaveCapacity, useSavePayout, useVacationMode } from "./api";

const SUPPORT = `https://wa.me/201289303016?text=${encodeURIComponent("أهلاً، كنت محتاج مساعدة بخصوص متجري على HandiMart.")}`;

export function StoreView() {
  const seller = useSeller();
  const s = seller.data ?? null;

  return (
    <div className="flex flex-col gap-10">
      <StoreHeader seller={s} loading={seller.isPending} />

      <Group title="إدارة المتجر">
        <RowLink icon={PencilSimple} title="تعديل بيانات المتجر" body="الاسم والوصف والصور والمنطقة والأقسام." href="/store/edit" />
        <VacationRow seller={s} />
        <CapacityRow />
      </Group>

      <Group title="المالية">
        <PayoutRow />
      </Group>

      <Group title="المساعدة والسياسات">
        <RowLink icon={WhatsappLogo} title="كلّم الدعم" body="فريق HandiMart على واتساب." href={SUPPORT} external />
        <RowLink icon={ShieldCheck} title="سياسة الخصوصية" href="/legal/PRIVACY_POLICY" />
        <RowLink icon={FileText} title="الشروط والأحكام" href="/legal/TERMS_OF_SERVICE" />
      </Group>

      <Group title="الحساب">
        <LogoutRow />
        <DeleteRow seller={s} />
      </Group>
    </div>
  );
}

function StoreHeader({ seller, loading }: { seller: Seller | null; loading: boolean }) {
  const store = seller?.store;
  const area = store?.regionPath?.length ? store.regionPath.map((r) => r.name).join(" › ") : store?.location?.city;
  return (
    <header className="relative">
      <div className="relative aspect-[5/2] overflow-hidden rounded-image-lg bg-secondary sm:aspect-[4/1]">
        {store?.bannerUrl ? (
          <Image src={store.bannerUrl} alt="" fill priority sizes="(min-width: 1280px) 64rem, 100vw" className="object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,var(--hm-primary)_0%,transparent_45%),radial-gradient(90%_90%_at_100%_100%,var(--hm-accent)_0%,transparent_50%)] opacity-70" />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[18px] border-[1.5px] border-dashed border-white/35" />
      </div>
      <div className="relative flex items-end gap-4 px-4 sm:px-6">
        <div className="relative -mt-10 size-20 shrink-0 sm:-mt-12 overflow-hidden rounded-full border-4 border-paper bg-surface-sunken sm:size-24">
          {store?.logoUrl ? <Image src={store.logoUrl} alt="" fill sizes="96px" className="object-cover" /> : <span className="grid size-full place-items-center text-title font-extrabold">{store?.name?.[0] ?? "؟"}</span>}
        </div>
        <div className="min-w-0 flex-1 pt-3">
          <p className="text-meta font-bold text-accent-text">ورشتك على HandiMart</p>
          {loading ? <Skeleton className="mt-1 h-8 w-48" /> : <h1 className="truncate text-headline font-extrabold">{store?.name ?? "متجري"}</h1>}
          {area ? (
            <p className="flex items-center gap-1 text-body-sm text-ink-2">
              <MapPin className="size-4" aria-hidden="true" />
              {area}
            </p>
          ) : seller && !store?.region ? (
            <p className="text-body-sm font-semibold text-warning">لسه محددتش منطقة محلك، والعملاء مش هيقدروا يلاقوك بالقرب منهم.</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <m.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} aria-label={title}>
      <h2 className="mb-3 text-meta font-bold text-ink-3">{title}</h2>
      <ul className="divide-y divide-dashed divide-line overflow-hidden rounded-image-lg border border-line bg-surface">{children}</ul>
    </m.section>
  );
}

function RowShell({ icon: I, title, body, end, tone = "ink" }: { icon: Icon; title: string; body?: ReactNode; end?: ReactNode; tone?: "ink" | "danger" }) {
  return (
    <>
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-standard ease-soft group-hover:-rotate-6 ${tone === "danger" ? "bg-error-container text-error" : "bg-surface-sunken text-ink-2"}`}>
        <I className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-body font-bold ${tone === "danger" ? "text-error" : ""}`}>{title}</span>
        {body && <span className="block text-body-sm text-ink-2">{body}</span>}
      </span>
      {end}
    </>
  );
}

const rowClass = "group flex w-full items-center gap-4 px-4 py-4 text-start transition-colors duration-quick hover:bg-paper sm:px-5";

function RowLink({ icon, title, body, href, external = false }: { icon: Icon; title: string; body?: string; href: string; external?: boolean }) {
  const end = <CaretLeft className="size-5 text-ink-3 transition-transform duration-standard ease-soft group-hover:-translate-x-1" aria-hidden="true" />;
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
          <RowShell icon={icon} title={title} body={body} end={end} />
        </a>
      ) : (
        <Link href={href} className={rowClass}>
          <RowShell icon={icon} title={title} body={body} end={end} />
        </Link>
      )}
    </li>
  );
}

function Switch({ on, busy, label, onToggle }: { on: boolean; busy: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onToggle}
      className={`relative h-8 w-14 shrink-0 rounded-full border-[1.5px] transition-colors duration-standard ${on ? "border-primary bg-primary" : "border-line-strong bg-surface-sunken"} disabled:opacity-60`}
    >
      <m.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }} className={`absolute top-1 size-5 rounded-full shadow-sm ${on ? "end-1 bg-on-primary" : "start-1 bg-ink-2"}`} />
    </button>
  );
}

function VacationRow({ seller }: { seller: Seller | null }) {
  const toast = useToast();
  const vacation = useVacationMode();
  const on = seller?.store?.vacationMode ?? false;
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (enabled: boolean) => {
    setError(null);
    vacation.mutate(enabled, {
      onSuccess: (now) => {
        setConfirm(false);
        toast.show(now ? "متجرك في إجازة. مش هيستقبل طلبات جديدة لحد ما ترجع." : "أهلاً بيك تاني! متجرك رجع يستقبل طلبات.");
      },
      onError: (e) => {
        const msg = e instanceof ApiError ? e.message : "معرفناش نغيّر وضع الإجازة.";
        if (enabled) setError(msg);
        else toast.show(msg, { tone: "error" });
      },
    });
  };

  return (
    <li className={rowClass.replace("hover:bg-paper", "")}>
      <RowShell
        icon={SunHorizon}
        title="وضع الإجازة"
        body={on ? "متجرك مخفي ومش بيستقبل طلبات جديدة لحد ما ترجع" : "متجرك شغال وجاهز يستقبل طلبات"}
        end={<Switch on={on} busy={vacation.isPending || !seller} label="وضع الإجازة" onToggle={() => (on ? set(false) : setConfirm(true))} />}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
          setError(null);
        }}
        onConfirm={() => set(true)}
        busy={vacation.isPending}
        title="تاخد إجازة؟"
        body="متجرك وقطعك هيختفوا من البحث، ومحدش هيقدر يطلب منك أو يبعتلك طلب تفصيل لحد ما ترجع. الطلبات اللي اتعملت قبل كده ماشية عادي."
        confirmLabel="ابدأ الإجازة"
      >
        {error && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </li>
  );
}

const identifierCheck = text({ min: 1, max: 100 });

function PayoutRow() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const method = wallet.data?.payoutMethod ?? null;
  return (
    <li>
      <button type="button" className={rowClass} onClick={() => setOpen(true)} disabled={wallet.isPending}>
        <RowShell
          icon={WalletIcon}
          title="طريقة استلام الأرباح"
          body={wallet.isError ? "معرفناش نجيب طريقة الاستلام." : method ? `${PAYOUT[method].label} · ${wallet.data?.payoutAccountIdentifier ?? ""}` : wallet.isPending ? "بنحمّل..." : "لسه متحددتش"}
          end={<CaretLeft className="size-5 text-ink-3" aria-hidden="true" />}
        />
      </button>
      {open && <PayoutDialog initialMethod={method} initialId={wallet.data?.payoutAccountIdentifier ?? ""} onClose={() => setOpen(false)} />}
    </li>
  );
}

function PayoutDialog({ initialMethod, initialId, onClose }: { initialMethod: PayoutMethod | null; initialId: string; onClose: () => void }) {
  const toast = useToast();
  const save = useSavePayout();
  const [method, setMethod] = useState<PayoutMethod>(initialMethod ?? "INSTAPAY");
  const [id, setId] = useState(initialId);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = identifierCheck(id) ? "لازم تكتب رقم الحساب أو المحفظة" : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (problem) return;
    save.mutate(
      { payoutMethod: method, accountIdentifier: id.trim() },
      {
        onSuccess: () => {
          toast.show("تم حفظ طريقة استلام الأرباح بنجاح");
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "معرفناش نحفظ طريقة الاستلام."),
      },
    );
  };

  return (
    <Dialog open onClose={onClose} title="طريقة استلام الأرباح" locked={save.isPending}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <p className="text-body text-ink-2">اختار الطريقة الأسهل ليك عشان تستلم فلوسك</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">الطريقة</legend>
          {(Object.keys(PAYOUT) as PayoutMethod[]).map((k) => (
            <label key={k} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control border-[1.5px] px-4 transition-colors duration-quick has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${method === k ? "border-primary bg-primary-container/50" : "border-line-strong hover:border-ink"}`}>
              <input type="radio" name="payout" className="sr-only" checked={method === k} onChange={() => setMethod(k)} />
              <span aria-hidden="true" className={`grid size-5 place-items-center rounded-full border-2 ${method === k ? "border-primary" : "border-line-strong"}`}>
                {method === k && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="text-body font-bold">{PAYOUT[k].label}</span>
            </label>
          ))}
        </fieldset>
        <TextField id="payout-id" label="رقم الحساب / المحفظة" dir="ltr" className="text-start" maxLength={100} placeholder={PAYOUT[method].placeholder} hint={PAYOUT[method].hint} value={id} onChange={(e) => setId(e.target.value)} error={submitted ? problem : null} />
        {error && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="quiet" onClick={onClose} disabled={save.isPending}>
            رجوع
          </Button>
          <Button type="submit" variant="secondary" disabled={save.isPending} aria-busy={save.isPending}>
            احفظ
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const capacityCheck = numberCheck({ min: 1, max: 500, whole: true });

function CapacityRow() {
  const toast = useToast();
  const save = useSaveCapacity();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = capacityCheck(value);

  const close = () => {
    setOpen(false);
    setSubmitted(false);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (problem) return;
    save.mutate(parseNumber(value)!, {
      onSuccess: () => {
        toast.show("اتحفظت طاقة الورشة");
        close();
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : "معرفناش نحفظ طاقة الورشة."),
    });
  };

  return (
    <li>
      <button type="button" className={rowClass} onClick={() => setOpen(true)}>
        <RowShell icon={Gauge} title="طاقة الورشة" body="كام قطعة تقدر تشتغل عليهم في نفس الوقت. بنحسب منها مواعيد التسليم." end={<CaretLeft className="size-5 text-ink-3" aria-hidden="true" />} />
      </button>
      <Dialog open={open} onClose={close} title="طاقة الورشة" locked={save.isPending}>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <p className="text-body text-ink-2">العدد ده بيأثر على وقت التسليم اللي العميل بيشوفه للقطع اللي بتتعمل بالطلب.</p>
          <TextField id="capacity" label="عدد القطع في نفس الوقت" inputMode="numeric" dir="ltr" className="text-start" placeholder="5" value={value} onChange={(e) => setValue(e.target.value)} error={submitted ? problem : null} hint="القيمة الحالية مش بتظهر هنا، اكتب العدد اللي يناسبك." />
          {error && (
            <p role="alert" className="text-body-sm font-semibold text-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="quiet" onClick={close} disabled={save.isPending}>
              رجوع
            </Button>
            <Button type="submit" variant="secondary" disabled={save.isPending} aria-busy={save.isPending}>
              احفظ
            </Button>
          </div>
        </form>
      </Dialog>
    </li>
  );
}

function LogoutRow() {
  const logout = useLogout();
  const [confirm, setConfirm] = useState(false);
  return (
    <li>
      <button type="button" className={rowClass} onClick={() => setConfirm(true)}>
        <RowShell icon={SignOut} title="تسجيل خروج" />
      </button>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => logout.mutate()} busy={logout.isPending} title="متأكد عايز تسجل خروج؟" body="هتحتاج تسجل دخول تاني عشان توصل لحسابك وبياناتك." confirmLabel="سجّل خروج" />
    </li>
  );
}

function DeleteRow({ seller }: { seller: Seller | null }) {
  const remove = useRequestDeletion();
  const logout = useLogout();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = deletionPending(seller);
  const when = seller?.user?.deletionScheduledFor;

  if (pending)
    return (
      <li className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <RowShell icon={Trash} tone="danger" title="حسابك هيتمسح" body={when ? `يوم ${formatDate(when)}. لو غيرت رأيك، سجّل دخول قبلها وفعّل حسابك تاني.` : "لو غيرت رأيك، سجّل دخول وفعّل حسابك تاني."} />
      </li>
    );

  return (
    <li>
      <button type="button" className={rowClass} onClick={() => setConfirm(true)}>
        <RowShell icon={Trash} tone="danger" title="امسح حسابي" body="بيتمسح بعد ٣٠ يوم، وتقدر ترجع فيه قبلها." />
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
          setError(null);
        }}
        onConfirm={() => {
          setError(null);
          remove.mutate(undefined, {
            onSuccess: () => logout.mutate(),
            onError: (e) => setError(e instanceof ApiError ? e.message : "معرفناش نبعت طلب المسح."),
          });
        }}
        busy={remove.isPending || logout.isPending}
        destructive
        title="تمسح حسابك؟"
        body="متجرك وقطعك هيختفوا، وحسابك هيتمسح نهائي بعد ٣٠ يوم. لو سجلت دخول قبلها تقدر تلغي المسح. هنسجل خروجك دلوقتي."
        confirmLabel="امسح حسابي"
      >
        {error && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </li>
  );
}
