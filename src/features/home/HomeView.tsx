"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChatsCircle, Package, Star } from "@phosphor-icons/react";
import { CountUp } from "@/components/motion/CountUp";
import { RevealGroup } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMark } from "@/components/ui/StatusTag";
import { Illustration } from "@/components/brand/Illustration";
import { formatAgo, formatCount, formatPrice, formatRating } from "@/lib/format";
import type { Seller } from "@/lib/types";
import { useSeller } from "@/features/auth/session";
import { useRecentOrders } from "@/features/orders/api";
import { STATUS, itemsSummary, orderRef } from "@/features/orders/status";
import { useBanners, useHomeStats, usePendingRequests, useReviewSummary, useTopProducts, useWallet, useWeekEarnings } from "./api";
import { ThreadChart } from "./ThreadChart";

/** App greeting by time of day (`home_greeting_*`). */
function greeting(seller: Seller | null | undefined, hour = new Date().getHours()) {
  const name = seller?.user?.displayName?.split(" ")[0];
  if (hour < 12) return name ? `صباح الخير يا ${name}، يوم جديد وفرصة لإنجاز أكتر` : "صباح الخير، يوم جديد وفرصة لإنجاز أكتر";
  if (hour < 17) return name ? `نهارك سعيد يا ${name}، إزاي شغلك لحد دلوقتي؟` : "نهارك سعيد، إزاي شغلك لحد دلوقتي؟";
  return name ? `مساء الخير يا ${name}، وقت مناسب لمراجعة إنجازات يومك` : "مساء الخير، وقت مناسب لمراجعة إنجازات يومك";
}

export function HomeView() {
  const { data: seller } = useSeller();
  return (
    <RevealGroup className="flex flex-col gap-8 lg:gap-10">
      <header className="max-w-3xl">
        <p className="enter text-meta font-bold text-accent-text">{seller?.store?.name ?? "ورشتك"}</p>
        <h1 className="enter mt-1 text-headline font-extrabold text-balance" style={{ "--i": 1 } as React.CSSProperties}>
          {greeting(seller)}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Attention />
        <Money />
      </div>

      <Pulse />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <RecentOrders />
        <TopProducts />
      </div>

      <Banners />
    </RevealGroup>
  );
}

/** "محتاجين إيدك": the work waiting on the seller, as a pinned work ticket. */
function Attention() {
  const stats = useHomeStats();
  const requests = usePendingRequests();
  const reviews = useReviewSummary();
  const pending = stats.data?.pendingOrders ?? 0;

  return (
    <section data-reveal="" aria-labelledby="attention-title" className="relative overflow-hidden rounded-image-lg bg-secondary p-6 text-on-secondary sm:p-8 lg:col-span-7">
      <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[18px] border-[1.5px] border-dashed border-on-secondary/25" />
      <div className="relative">
        <p className="text-meta font-bold text-on-secondary-accent">محتاجين إيدك</p>
        {stats.isPending ? (
          <Skeleton className="mt-3 h-10 w-2/3 bg-on-secondary/10" />
        ) : stats.isError ? (
          <p className="mt-2 text-title font-extrabold">معرفناش نجيب إحصائياتك دلوقتي</p>
        ) : pending > 0 ? (
          <>
            <h2 id="attention-title" className="mt-2 text-headline font-extrabold">
              <CountUp value={pending} format={formatCount} /> طلب مستني منك خطوة
            </h2>
            <p className="mt-2 max-w-md text-body opacity-85">اقبل الجديد، وجهّز اللي اتأكد، قبل ما العميل يستنى.</p>
          </>
        ) : (
          <>
            <h2 id="attention-title" className="mt-2 text-headline font-extrabold">
              كل الطلبات ماشية تمام
            </h2>
            <p className="mt-2 max-w-md text-body opacity-85">مفيش طلب مستني منك حاجة دلوقتي.</p>
          </>
        )}

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
          <li className="flex items-center gap-2">
            <ChatsCircle className="size-5 text-on-secondary-accent" aria-hidden="true" />
            {requests.data != null ? `${formatCount(requests.data)} طلب تفصيل مستني عرضك` : requests.isPending ? "بنحسب طلبات التفصيل..." : "طلبات التفصيل مش متاحة دلوقتي"}
          </li>
          <li className="flex items-center gap-2">
            <Star className="size-5 text-on-secondary-accent" aria-hidden="true" />
            {reviews.data?.awaitingReplyCount != null ? `${formatCount(reviews.data.awaitingReplyCount)} تقييم مستني ردك` : reviews.isPending ? "بنحسب التقييمات..." : "التقييمات مش متاحة دلوقتي"}
          </li>
        </ul>

        <ButtonLink href="/orders?status=PENDING" className="mt-7">
          افتح الطلبات
          <ArrowLeft className="size-5" aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}

/** "فلوسك": balances and the week's earnings thread. */
function Money() {
  const wallet = useWallet();
  const week = useWeekEarnings();
  return (
    <section data-reveal="" aria-labelledby="money-title" className="flex flex-col rounded-image-lg border border-line bg-surface p-6 sm:p-7 lg:col-span-5">
      <h2 id="money-title" className="text-subtitle font-extrabold">
        فلوسك
      </h2>
      {wallet.isPending ? (
        <Skeleton className="mt-3 h-12 w-1/2" />
      ) : wallet.isError ? (
        <p className="mt-3 text-body-sm text-ink-2">معرفناش نجيب بيانات محفظتك. تقدر تحاول مرة تاني؟</p>
      ) : (
        <>
          <p className="mt-3 text-meta font-bold text-ink-2">متاح للسحب</p>
          <p className="text-price-lg font-extrabold">
            <CountUp value={wallet.data.availableBalance} format={formatPrice} />
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <dt className="text-meta text-ink-3">محجوز لحد ما الطلبات تكتمل</dt>
              <dd className="font-bold">{formatPrice(wallet.data.pendingBalance)}</dd>
            </div>
            <div>
              <dt className="text-meta text-ink-3">إجمالي أرباحك</dt>
              <dd className="font-bold">{formatPrice(wallet.data.lifetimeEarnings)}</dd>
            </div>
          </dl>
        </>
      )}
      <div className="stitch my-5 opacity-70" aria-hidden="true" />
      <p className="mb-2 text-meta font-bold text-ink-2">آخر 7 أيام</p>
      {week.isPending ? <Skeleton className="h-28" /> : week.isError ? <p className="text-body-sm text-ink-2">معرفناش نجيب الرسم دلوقتي.</p> : week.data.length ? <ThreadChart buckets={week.data} /> : <p className="text-body-sm text-ink-2">لسه مفيش أرباح الأسبوع ده.</p>}
    </section>
  );
}

/** Store pulse: the four numbers from `seller/home/stats`, unboxed, split by stitches. */
function Pulse() {
  const stats = useHomeStats();
  if (stats.isError) return <SectionError message="معرفناش نجيب إحصائياتك دلوقتي" />;
  const s = stats.data;
  const items = [
    { label: "إجمالي الطلبات", value: s?.totalOrders, format: formatCount },
    { label: "مستني ردك", value: s?.pendingOrders, format: formatCount },
    { label: "تقييم متجرك", value: s?.storeAverageRating ?? null, format: (n: number) => formatRating(n), empty: "لسه مفيش تقييمات" },
    { label: "عدد التقييمات", value: s?.totalReviews, format: formatCount },
  ];
  return (
    <section data-reveal="" aria-label="أرقام متجرك">
      <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.label} className={`px-4 first:ps-0 ${i % 2 ? "border-s-2 border-dashed border-line" : ""} ${i === 2 ? "sm:border-s-2 sm:border-dashed sm:border-line" : ""}`}>
            <dt className="text-meta font-bold text-ink-2">{item.label}</dt>
            <dd className="mt-1 text-headline font-extrabold">
              {stats.isPending ? <Skeleton className="h-9 w-16" /> : item.value == null ? <span className="text-body-sm font-semibold text-ink-3">{item.empty ?? "-"}</span> : <CountUp value={item.value} format={item.format} />}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RecentOrders() {
  const orders = useRecentOrders(5);
  return (
    <section data-reveal="" aria-labelledby="recent-title" className="lg:col-span-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-meta font-bold text-accent-text">آخر اللي وصل</p>
          <h2 id="recent-title" className="text-title font-extrabold">
            آخر الطلبات
          </h2>
        </div>
        <Link href="/orders" className="group inline-flex min-h-11 items-center gap-1.5 text-body-sm font-bold hover:text-accent-text">
          عرض الكل
          <ArrowLeft className="size-4 transition-transform duration-standard ease-soft group-hover:-translate-x-1" aria-hidden="true" />
        </Link>
      </div>
      {orders.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : orders.isError ? (
        <SectionError message="معرفناش نجيب آخر الطلبات" />
      ) : orders.data.content.length === 0 ? (
        <div className="flex items-center gap-4 rounded-image bg-surface p-5">
          <Illustration name="emptyBasket" className="w-24 shrink-0" />
          <div>
            <p className="text-subtitle font-bold">لسه مفيش طلبات</p>
            <p className="text-body-sm text-ink-2">أول ما يجيلك طلب جديد، هتلاقيه هنا. اشتغل أكتر على منتجاتك أو روّج لمتجرك.</p>
          </div>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-image border border-line bg-surface">
          {orders.data.content.map((o) => (
            <li key={o.id} className="border-b border-dashed border-line last:border-0">
              <Link href={`/orders?open=${o.id}`} className="group flex items-center gap-4 px-4 py-3 transition-colors duration-quick hover:bg-paper">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-2 transition-transform duration-standard ease-soft group-hover:-rotate-6">
                  <Package className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-bold">{itemsSummary(o)}</span>
                  <span className="block truncate text-meta text-ink-3">
                    {o.customerName ?? "عميل"} · <bdi dir="ltr">{orderRef(o.id)}</bdi> · {formatAgo(o.createdAt)}
                  </span>
                </span>
                <span className="hidden text-end sm:block">
                  <span className="block text-body-sm font-extrabold">{formatPrice(o.netEarning)}</span>
                  <span className="block text-meta text-ink-3">صافي ليك</span>
                </span>
                <StatusMark tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusMark>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopProducts() {
  const top = useTopProducts();
  return (
    <section data-reveal="" aria-labelledby="top-title" className="lg:col-span-4">
      <p className="text-meta font-bold text-accent-text">أحلى شغلك</p>
      <h2 id="top-title" className="mb-3 text-title font-extrabold">
        الأكثر مبيعًا
      </h2>
      {top.isPending ? (
        <Skeleton className="h-64" />
      ) : top.isError ? (
        <SectionError />
      ) : top.data.length === 0 ? (
        <p className="rounded-image bg-surface p-5 text-body-sm text-ink-2">لسه مفيش مبيعات كفاية. أول ما تبيع منتجات، هتلاقي الأكثر مبيعًا هنا.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {top.data.map((p, i) => (
            <li key={p.id} className="card-lift flex items-center gap-3 rounded-image bg-surface p-2.5 pe-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-surface-sunken">
                {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                <span className="absolute top-1 start-1 grid size-5 place-items-center rounded-full bg-paper text-[0.6875rem] font-extrabold">{i + 1}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-bold">{p.name}</span>
                <span className="block text-meta text-ink-3">{formatCount(p.unitsSold)} قطعة اتباعت</span>
              </span>
              <span className="text-body-sm font-extrabold">{formatPrice(p.currentPrice)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Announcements from HandiMart (`seller/home/banners`). Hidden when there are none. */
function Banners() {
  const banners = useBanners();
  const list = (banners.data ?? []).filter((b) => b.mediaUrl && b.mediaType !== "VIDEO");
  if (!list.length) return null;
  return (
    <section data-reveal="" aria-label="من هاندي مارت">
      <p className="mb-3 text-meta font-bold text-accent-text">من هاندي مارت</p>
      <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
        {list.map((b) => (
          <li key={b.id} className="relative aspect-16/7 w-[min(36rem,85vw)] shrink-0 snap-start overflow-hidden rounded-image-lg bg-surface-sunken">
            <Image src={b.mediaUrl!} alt={b.title ?? ""} fill sizes="(min-width: 768px) 36rem, 85vw" className="object-cover" />
            {(b.title || b.description) && (
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-brand-night/85 to-transparent p-5 pt-12 text-brand-sand">
                {b.title && <p className="text-subtitle font-extrabold">{b.title}</p>}
                {b.description && <p className="line-clamp-2 text-body-sm opacity-85">{b.description}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
