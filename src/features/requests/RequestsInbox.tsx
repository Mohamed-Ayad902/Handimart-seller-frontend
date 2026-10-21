"use client";

import Image from "next/image";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, type ReactNode } from "react";
import { m } from "motion/react";
import { ChatsCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMark } from "@/components/ui/StatusTag";
import { formatAgo, formatCount } from "@/lib/format";
import type { CustomRequest } from "@/lib/types";
import { usePendingRequests } from "@/features/home/api";
import { useRequests } from "./api";
import { requestStatus } from "./labels";

/**
 * Two panes on wide screens: the inbox beside the open request. On phones the open request takes
 * the whole screen and the inbox comes back with the browser's back button.
 */
export function RequestsShell({ children }: { children: ReactNode }) {
  const openId = useSelectedLayoutSegment();
  const pending = usePendingRequests();
  return (
    <div className="flex flex-col gap-6">
      <header className={openId ? "max-lg:hidden" : undefined}>
        <p className="enter text-meta font-bold text-accent-text">{pending.data ? `${formatCount(pending.data)} مستنيين ردك` : "عملاء عايزين قطعة على مزاجهم"}</p>
        <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
          طلبات التفصيل
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(20rem,26rem)_1fr]">
        <div className={openId ? "max-lg:hidden" : undefined}>
          <Inbox openId={openId} />
        </div>
        <div className={openId ? undefined : "max-lg:hidden"}>{children}</div>
      </div>
    </div>
  );
}

function Inbox({ openId }: { openId: string | null }) {
  const [waiting, setWaiting] = useState(true);
  const [page, setPage] = useState(0);
  const list = useRequests(waiting, page);
  const tabs = [
    { on: true, label: "مستنية ردك" },
    { on: false, label: "الكل" },
  ];

  return (
    <section aria-label="صندوق طلبات التفصيل" className="lg:sticky lg:top-24">
      <div role="tablist" aria-label="عرض" className="mb-3 flex w-max gap-1 border-b border-divider">
        {tabs.map((t) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={waiting === t.on}
            onClick={() => {
              setWaiting(t.on);
              setPage(0);
            }}
            className={`relative min-h-11 px-3.5 text-body-sm whitespace-nowrap ${waiting === t.on ? "font-extrabold text-ink" : "font-semibold text-ink-2 hover:text-ink"}`}
          >
            {t.label}
            {waiting === t.on && <m.span layoutId="requests-tab" aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : list.isError ? (
        <SectionError message="معرفناش نجيب طلبات التفصيل." />
      ) : list.data.content.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-image bg-surface p-6 text-center">
          <ChatsCircle className="size-10 text-ink-3" aria-hidden="true" />
          <p className="text-subtitle font-bold">{waiting ? "مفيش طلبات مستنياك" : "لسه مفيش طلبات تفصيل"}</p>
          <p className="text-body-sm text-ink-2">
            {waiting
              ? "لما عميل يطلب تعديل على قطعة من قطعك، هيظهر هنا عشان تسعّره."
              : "العملاء يقدروا يطلبوا منك لون أو مقاس أو تفصيلة مختلفة من صفحة القطعة، وانت اللي بتحدد السعر والمدة."}
          </p>
        </div>
      ) : (
        <>
          <ul className={`overflow-hidden rounded-image border border-line bg-surface transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
            {list.data.content.map((r) => (
              <li key={r.id} className="border-b border-dashed border-line last:border-0">
                <Row request={r} active={r.id === openId} />
              </li>
            ))}
          </ul>
          {list.data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="quiet" className="min-h-10 px-4 text-body-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                الأحدث
              </Button>
              <span className="text-meta text-ink-3">
                {page + 1} من {list.data.totalPages}
              </span>
              <Button variant="quiet" className="min-h-10 px-4 text-body-sm" disabled={list.data.last} onClick={() => setPage((p) => p + 1)}>
                الأقدم
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Row({ request: r, active }: { request: CustomRequest; active: boolean }) {
  const s = requestStatus(r);
  return (
    <Link
      href={`/requests/${r.id}`}
      aria-current={active ? "page" : undefined}
      className={`group relative flex gap-3 px-3.5 py-3 transition-colors duration-quick hover:bg-paper ${active ? "bg-paper" : ""}`}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary" />}
      <span className="relative size-14 shrink-0 overflow-hidden rounded-[12px] bg-surface-sunken">
        {r.productImageUrl && <Image src={r.productImageUrl} alt="" fill sizes="56px" className="object-cover transition-transform duration-emphasized ease-soft group-hover:scale-105" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-body-sm font-bold">{r.productName}</span>
          <span className="shrink-0 text-meta text-ink-3">{formatAgo(r.updatedAt ?? r.createdAt)}</span>
        </span>
        <span className="line-clamp-1 text-meta text-ink-2">{r.description}</span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-meta text-ink-3">
            {r.customerName ? `${r.customerName} · ` : ""}
            {r.quantity} قطعة
          </span>
          <StatusMark tone={s.tone} className="text-meta">
            {s.label}
          </StatusMark>
        </span>
      </span>
    </Link>
  );
}
