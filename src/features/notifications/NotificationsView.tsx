"use client";

import { useRouter } from "next/navigation";
import { Checks } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { ApiError } from "@/lib/client/api";
import { formatAgo, formatCount } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { useUnreadCount } from "@/features/shell/badges";
import { dayLabel, groupByDay } from "@/features/wallet/ledger";
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from "./api";
import { notificationLink } from "./target";

export function NotificationsView() {
  const list = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markAll = useMarkAllRead();
  const items = list.data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="enter text-meta font-bold text-accent-text">{unread ? `${formatCount(unread)} إشعار جديد` : "متابع كل حاجة"}</p>
          <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
            الإشعارات
          </h1>
        </div>
        {unread > 0 && (
          <Button variant="quiet" onClick={() => markAll.mutate()} disabled={markAll.isPending} aria-busy={markAll.isPending}>
            {markAll.isPending ? <Spinner /> : <Checks className="size-5" aria-hidden="true" />}
            علّم الكل كمقروء
          </Button>
        )}
      </header>
      {markAll.isError && (
        <p role="alert" className="text-body-sm font-semibold text-error">
          {markAll.error instanceof ApiError ? markAll.error.message : "معرفناش نعلّمهم. جرّب تاني."}
        </p>
      )}
      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : list.isError ? (
        <SectionError message="معرفناش نجيب إشعاراتك." />
      ) : !items.length ? (
        <StateView illustration="emptySpool" title="مفيش إشعارات لسه" body="هنبلغك هنا أول ما يوصلك طلب أو رسالة أو تقييم جديد." />
      ) : (
        <>
          {groupByDay(items, (n) => n.createdAt).map((g) => (
            <section key={g.day} aria-label={dayLabel(g.day)}>
              <h2 className="mb-2 text-meta font-bold text-ink-3">{dayLabel(g.day)}</h2>
              <ul className="overflow-hidden rounded-image border border-line bg-surface">
                {g.items.map((n) => (
                  <li key={n.id} className="border-b border-dashed border-line last:border-0">
                    <NotificationRow notification={n} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {list.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="quiet" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage && <Spinner />}
                اعرض أقدم
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One notification; opening it marks it read and goes where it points. Shared with the bell menu. */
export function NotificationRow({ notification: n, compact = false, onOpen }: { notification: AppNotification; compact?: boolean; onOpen?: () => void }) {
  const router = useRouter();
  const read = useMarkNotificationRead();
  const { href, icon: Icon } = notificationLink(n);

  const open = () => {
    if (!n.isRead) read.mutate(n.id);
    onOpen?.();
    if (href) router.push(href);
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={!href && n.isRead}
      className={`relative flex w-full items-start gap-3 text-start transition-colors duration-quick hover:bg-paper disabled:cursor-default disabled:hover:bg-transparent ${compact ? "px-3 py-2.5" : "px-4 py-3.5"} ${n.isRead ? "" : "bg-primary-container/30"}`}
    >
      <span className={`grid shrink-0 place-items-center rounded-full ${compact ? "size-9" : "size-11"} ${n.isRead ? "bg-surface-sunken text-ink-2" : "bg-secondary text-on-secondary"}`}>
        <Icon className={compact ? "size-4.5" : "size-5"} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`text-body-sm ${n.isRead ? "font-bold" : "font-extrabold"} ${compact ? "line-clamp-1" : ""}`}>{n.title}</span>
          <span className="shrink-0 text-meta text-ink-3">{formatAgo(n.createdAt)}</span>
        </span>
        <span className={`mt-0.5 block text-meta text-ink-2 ${compact ? "line-clamp-2" : ""}`}>{n.message}</span>
      </span>
      {!n.isRead && (
        <>
          <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
          <span className="sr-only">جديد</span>
        </>
      )}
    </button>
  );
}
