"use client";

import Link from "next/link";
import { Info, Medal, Megaphone, Percent, Sparkle, Star, Trophy } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { formatCount, formatDate, formatPrice } from "@/lib/format";
import type { SellerGoal, SellerReward } from "@/lib/types";
import { useGoals, useMarkRewardSeen } from "./api";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const INSTANT = new Set(["BOOST_CREDIT", "FEATURED_PLACEMENT", "BADGE"]);

/** What a reward gives, in business words, from the server's type, value and label (app `rewardText`). */
function rewardText(type: string, value: number | null, uses: number, label: string | null, fallback: string): string {
  const v = value ?? 0;
  switch (type) {
    case "PLATFORM_FEE": {
      // The server sends the share of the normal fee still paid: 0 = waived, 50 = half off.
      const off = 100 - v;
      if (off >= 100) return uses > 1 ? `${formatCount(uses)} طلبات جاية من غير عمولة منصة` : "طلبك الجاي من غير عمولة منصة";
      return uses > 1 ? `خصم ${number.format(off)}% على عمولة ${formatCount(uses)} طلبات جاية` : `خصم ${number.format(off)}% على عمولة طلبك الجاي`;
    }
    case "BOOST_CREDIT":
      return `إعلان مجاني لمتجرك ${number.format(v)} يوم`;
    case "FEATURED_PLACEMENT":
      return `متجرك في الواجهة ${number.format(v)} يوم`;
    case "BADGE":
      return `شارة «${label ?? fallback}» على متجرك`;
    default:
      return label ?? fallback;
  }
}

const REWARD_ICON: Record<string, Icon> = { PLATFORM_FEE: Percent, BOOST_CREDIT: Megaphone, FEATURED_PLACEMENT: Sparkle, BADGE: Medal };

function goalNumber(g: SellerGoal, n: number): string {
  return g.conditionType === "TOTAL_SALES" ? formatPrice(n) : number.format(n);
}

function unitLabel(g: SellerGoal): string | null {
  if (g.conditionType === "ORDERS_COMPLETED") return "طلبات مكتملة";
  if (g.conditionType === "TOTAL_SALES") return "مبيعات اتسلّمت واكتملت";
  if (g.conditionType === "AVERAGE_RATING") return g.minSample ? `متوسط تقييمات عملائك (بحد أدنى ${formatCount(g.minSample)} تقييم)` : "متوسط تقييمات عملائك";
  return null;
}

export function GoalsView() {
  const goals = useGoals();
  const seen = useMarkRewardSeen();
  const unseen = goals.data?.rewards.find((r) => !r.seen) ?? null;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="enter text-meta font-bold text-accent-text">شغلك بيفرق</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          أهدافك
        </h1>
      </header>

      {goals.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : goals.isError ? (
        <SectionError message="معرفناش نجيب أهدافك." />
      ) : (
        <>
          <section aria-labelledby="goals-running">
            <h2 id="goals-running" className="mb-4 text-title font-extrabold">
              أهداف شغّالة
            </h2>
            {!goals.data.goals.length ? (
              <StateView illustration="emptySpool" title="مفيش أهداف شغّالة دلوقتي" body="أول ما يبقى فيه هدف جديد هتلاقيه هنا، ومعاه المكافأة اللي هيفتحها." />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {goals.data.goals.map((g) => (
                  <li key={`${g.goalId}-${g.cycleNumber ?? 0}`}>
                    <GoalCard goal={g} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {goals.data.rewards.length > 0 && (
            <section aria-labelledby="goals-rewards">
              <h2 id="goals-rewards" className="mb-4 text-title font-extrabold">
                مكافآتك
              </h2>
              <ul className="overflow-hidden rounded-image border border-line bg-surface">
                {goals.data.rewards.map((r) => (
                  <li key={r.id} className="border-b border-dashed border-line last:border-0">
                    <RewardRow reward={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <aside className="flex gap-3 rounded-image bg-surface-sunken p-5">
            <Info className="mt-0.5 size-6 shrink-0 text-ink-2" aria-hidden="true" />
            <div>
              <h2 className="text-subtitle font-extrabold">إزاي بتتحسب؟</h2>
              <p className="mt-1 max-w-[70ch] text-body-sm text-ink-2">
                التقدّم بيتحسب من شغلك الحقيقي: الطلبات اللي اتسلّمت واكتملت، ومبيعاتها، وتقييمات عملائك. الطلبات الملغية أو المرتجعة مش بتتحسب. مكافآت العمولة بتتطبّق على أول طلب جديد، والباقي بيشتغل على طول.
              </p>
            </div>
          </aside>
        </>
      )}

      {unseen && <Unlocked reward={unseen} onDone={() => seen.mutate(unseen.id)} />}
    </div>
  );
}

function GoalCard({ goal: g }: { goal: SellerGoal }) {
  const done = g.status === "COMPLETED";
  const share = g.target > 0 ? Math.max(0, Math.min(1, g.progress / g.target)) : 0;
  const reward = rewardText(g.rewardType, g.rewardValue, g.rewardUses ?? 1, g.rewardLabel, g.description ?? g.title);
  const I = REWARD_ICON[g.rewardType] ?? Trophy;
  const unit = unitLabel(g);

  return (
    <article className="flex h-full flex-col gap-4 rounded-image-lg border border-line bg-surface p-5 transition-[transform,box-shadow] duration-standard ease-soft hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgb(42_19_48/0.55)] motion-reduce:hover:translate-y-0">
      <div className="flex items-start gap-4">
        <Ring share={share} done={done} />
        <div className="min-w-0 flex-1">
          <h3 className="text-subtitle font-extrabold">{g.title}</h3>
          {g.description && <p className="mt-0.5 text-body-sm text-ink-2">{g.description}</p>}
          {unit && <p className="mt-1 text-meta text-ink-3">{unit}</p>}
        </div>
      </div>
      <div>
        <p className="flex items-baseline justify-between gap-2 text-body-sm">
          <span className="font-extrabold tabular-nums">{goalNumber(g, g.progress)}</span>
          <span className="text-ink-3 tabular-nums">من {goalNumber(g, g.target)}</span>
        </p>
        <div
          role="progressbar"
          aria-label={g.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-emphasized ${done ? "bg-success" : "bg-secondary"}`} style={{ width: `${share * 100}%` }} />
        </div>
      </div>
      <div className="mt-auto flex items-start gap-2.5 rounded-image bg-paper p-3">
        <I className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
        <p className="text-body-sm">
          {done ? <span className="font-bold text-success">الهدف اتحقق، مكافأتك جاهزة: </span> : <span className="text-ink-2">فاضلك {goalNumber(g, g.remaining)} عشان تفتح: </span>}
          <span className="font-bold">{reward}</span>
        </p>
      </div>
      {g.endsAt && <p className="-mt-2 text-meta text-ink-3">لحد {formatDate(g.endsAt)}</p>}
    </article>
  );
}

/** Progress ring; the number inside says it too. */
function Ring({ share, done }: { share: number; done: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-surface-sunken" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} className={`motion-safe:transition-[stroke-dashoffset] motion-safe:duration-emphasized ${done ? "stroke-success" : "stroke-secondary"}`} />
      </svg>
      {done ? <Trophy weight="fill" className="size-6 text-success" /> : <span className="text-meta font-extrabold tabular-nums">{Math.floor(share * 100)}%</span>}
    </span>
  );
}

function rewardState(r: SellerReward): { label: string; tone: StatusTone; line: string | null } {
  const instant = INSTANT.has(r.rewardType);
  if (r.status === "REDEEMED" && instant) return { label: "شغّالة", tone: "success", line: r.expiresAt ? `شغّالة على متجرك لحد ${formatDate(r.expiresAt)}` : "شغّالة على متجرك" };
  if (r.status === "REDEEMED")
    return {
      label: "اتطبّقت",
      tone: "info",
      line: r.redeemedOrderShortId ? `اتطبّقت على الطلب ${r.redeemedOrderShortId}${r.savedAmount ? ` ووفّرت ${formatPrice(r.savedAmount)}` : ""}` : null,
    };
  if (r.status === "EXPIRED") return { label: "انتهت", tone: "neutral", line: null };
  return { label: "جاهزة", tone: "success", line: r.expiresAt ? `صالحة لحد ${formatDate(r.expiresAt)}، هتتطبّق تلقائي على طلبك الجاي` : "جاهزة، هتتطبّق تلقائي على طلبك الجاي" };
}

function RewardRow({ reward: r }: { reward: SellerReward }) {
  const s = rewardState(r);
  const I = REWARD_ICON[r.rewardType] ?? Star;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${r.status === "EXPIRED" ? "bg-surface-sunken text-ink-3" : "bg-secondary text-on-secondary"}`}>
        <I className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-extrabold">{rewardText(r.rewardType, r.rewardValue, 1, r.label, r.goalTitle)}</p>
        <p className="text-meta text-ink-2">
          من هدف «{r.goalTitle}» · {formatDate(r.grantedAt)}
        </p>
        {s.line &&
          (r.redeemedOrderId && r.status === "REDEEMED" && !INSTANT.has(r.rewardType) ? (
            <Link href={`/orders?open=${r.redeemedOrderId}`} className="text-meta font-bold text-accent-text hover:underline">
              {s.line}
            </Link>
          ) : (
            <p className="text-meta text-ink-3">{s.line}</p>
          ))}
      </div>
      <StatusTag tone={s.tone}>{s.label}</StatusTag>
    </div>
  );
}

/** The "reward unlocked" moment, once per reward; closing it any way counts as seen. */
function Unlocked({ reward: r, onDone }: { reward: SellerReward; onDone: () => void }) {
  const text = rewardText(r.rewardType, r.rewardValue, 1, r.label, r.goalTitle);
  return (
    <Dialog open onClose={onDone} title={`خلّصت هدف «${r.goalTitle}»`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-primary-container text-on-primary-container motion-safe:animate-[hm-pop_600ms_cubic-bezier(0.22,1,0.36,1)_backwards]">
          <Trophy weight="fill" className="size-10" aria-hidden="true" />
        </span>
        <p className="text-meta font-bold text-accent-text">مكافأة جديدة</p>
        <p className="text-body text-ink-2">{INSTANT.has(r.rewardType) ? `${text}. اتفعّلت على متجرك دلوقتي.` : `${text}. مش محتاج تعمل حاجة، هتتطبّق لوحدها على أول طلب جديد.`}</p>
        <Button onClick={onDone} className="w-full sm:w-auto">
          تمام
        </Button>
      </div>
    </Dialog>
  );
}
