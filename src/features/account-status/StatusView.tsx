"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChatCircleDots, PencilSimple, SignOut } from "@phosphor-icons/react";
import { LogoMark } from "@/components/brand/LogoMark";
import { Illustration } from "@/components/brand/Illustration";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stitch } from "@/components/ui/Stitch";
import { formatDate } from "@/lib/format";
import { teamComment } from "@/lib/seller";
import type { Seller } from "@/lib/types";
import { REASONS } from "@/features/account-status/reasons";
import { homeFor, useLogout, useSeller } from "@/features/auth/session";

const SUPPORT = `https://wa.me/201289303016?text=${encodeURIComponent("أهلاً، كنت محتاج مساعدة بخصوص حساب التاجر بتاعي.")}`;


function copyFor(seller: Seller) {
  switch (seller.accountStatus) {
    case "REJECTED":
      return { kicker: "رجّعناه بملاحظات", title: "طلبك محتاج شوية تعديلات", body: "راجعنا طلبك، وفيه شوية تفاصيل محتاجة تتعدل قبل ما نفتح متجرك. عدّل اللي محتاج يتعدل من هنا، وابعته وهنراجعه تاني.", art: "cutThread" as const };
    case "SUSPENDED":
      return { kicker: "وقفة مؤقتة", title: "حسابك موقوف مؤقتاً", body: "وقفنا حسابك مؤقتاً عشان فيه مخالفة لسياسات المنصة.", art: "tangledThread" as const };
    case "ONBOARDING":
      return { kicker: "لسه فاضل خطوات", title: "كمّل تسجيل متجرك", body: "فاضل كام خطوة في تسجيل متجرك. كمّلها، وبعد ما نراجعه ونفعّله هتقدر تدير متجرك من هنا.", art: "emptySpool" as const };
    default:
      return { kicker: "على الماكينة", title: "طلبك بيتراجع دلوقتي", body: "بنراجع بيانات متجرك عشان نضمن أحسن تجربة، وهنفعل حسابك خلال 24 لـ 48 ساعة بالكتير.", art: "threadSearch" as const };
  }
}

/** The review journey as a running seam: sewn stitches are done, the needle marks where it is now. */
function ReviewSeam() {
  const steps = [
    { title: "استلمنا طلبك", body: "كل بياناتك كاملة ومظبوطة", state: "done" },
    { title: "في المراجعة", body: "فريقنا بيراجع طلبك دلوقتي", state: "current" },
    { title: "هيوصلك إشعار", body: "هيوصلك إشعار على موبايلك", state: "next" },
  ] as const;
  return (
    <ol className="mt-8 flex flex-col">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span aria-hidden="true" className={`absolute top-6 bottom-0 start-[0.6875rem] w-0.5 ${s.state === "done" ? "bg-ink" : "bg-[repeating-linear-gradient(to_bottom,var(--hm-border-strong)_0_6px,transparent_6px_11px)]"}`} />
          )}
          <span
            aria-hidden="true"
            className={`relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${s.state === "done" ? "border-ink bg-ink" : s.state === "current" ? "border-primary bg-paper" : "border-line-strong bg-paper"}`}
          >
            {s.state === "current" && <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />}
          </span>
          <div>
            <p className={`text-subtitle font-bold ${s.state === "next" ? "text-ink-2" : "text-ink"}`}>
              {s.title}
              {s.state === "current" && <span className="sr-only"> (الخطوة الحالية)</span>}
            </p>
            <p className="text-body-sm text-ink-2">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StatusView() {
  const router = useRouter();
  const { data: seller, isPending, isError, refetch } = useSeller();
  const logout = useLogout();

  useEffect(() => {
    if (isPending || isError) return;
    if (!seller) router.replace("/login");
    else if (seller.accountStatus === "ACTIVE" || seller.accountStatus === "ONBOARDING") router.replace(homeFor(seller));
  }, [seller, isPending, isError, router]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-8 sm:py-14">
      <div className="flex items-center justify-between">
        <LogoMark className="h-9 w-auto text-secondary" title="هانديمارت" />
        <Button variant="quiet" className="min-h-11 px-4" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <SignOut className="size-5" aria-hidden="true" />
          تسجيل خروج
        </Button>
      </div>

      {isPending || !seller || seller.accountStatus === "ACTIVE" ? (
        isError ? (
          <div className="mt-16 text-center" role="alert">
            <p className="text-body text-ink-2">معرفناش نجيب حالة حسابك دلوقتي.</p>
            <Button className="mt-4" onClick={() => refetch()}>
              حاول مرة أخرى
            </Button>
          </div>
        ) : (
          <div className="mt-16 flex flex-col gap-4" aria-busy="true" aria-label="بنحمّل حالة حسابك">
            <Skeleton className="h-40 w-48 self-center" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20" />
          </div>
        )
      ) : (
        <Status seller={seller} />
      )}
    </main>
  );
}

function Status({ seller }: { seller: Seller }) {
  const c = copyFor(seller);
  const note = teamComment(seller);
  return (
    <section className="page-enter mt-10 sm:mt-14" aria-labelledby="status-title">
      <Illustration name={c.art} className="w-44" />
      <p className="mt-6 text-meta font-bold text-accent-text">{c.kicker}</p>
      <h1 id="status-title" className="mt-1 text-headline font-extrabold">
        {c.title}
      </h1>
      <p className="mt-3 text-body text-ink-2">{c.body}</p>

      {seller.accountStatus === "IN_REVIEW" && <ReviewSeam />}

      {seller.accountStatus === "REJECTED" && seller.rejectionReason && (
        <p className="mt-6 rounded-image bg-error-container/70 p-4 text-body-sm font-semibold text-ink">{REASONS[seller.rejectionReason]}</p>
      )}

      {seller.accountStatus === "SUSPENDED" && seller.suspensionUntil && (
        <p className="mt-6 text-body font-bold">
          الإيقاف هيتشال يوم: <time dateTime={seller.suspensionUntil}>{formatDate(seller.suspensionUntil)}</time>
        </p>
      )}

      {note && (
        <figure className="mt-6 rounded-image bg-surface p-4">
          <figcaption className="text-meta font-bold text-ink-2">ملاحظة الفريق</figcaption>
          <blockquote className="mt-1 text-body whitespace-pre-line">{note}</blockquote>
        </figure>
      )}

      <Stitch className="my-8" />
      <div className="flex flex-col gap-3 sm:flex-row">
        {seller.accountStatus === "REJECTED" && (
          <ButtonLink href="/register" className="w-full sm:w-auto">
            <PencilSimple className="size-5" aria-hidden="true" />
            عدّل طلبك
          </ButtonLink>
        )}
        <a href={SUPPORT} target="_blank" rel="noopener noreferrer" className={buttonClass(seller.accountStatus === "REJECTED" ? "quiet" : "secondary", "w-full sm:w-auto")}>
          <ChatCircleDots className="size-5" aria-hidden="true" />
          كلم الدعم
        </a>
      </div>
    </section>
  );
}
