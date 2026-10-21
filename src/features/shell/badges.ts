"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { BadgeKey } from "@/lib/nav";
import { useHomeStats, usePendingRequests } from "@/features/home/api";

export const unreadKey = ["notifications", "unread"] as const;

/**
 * Unread notifications. There is no web push (handover G2), so the count is polled every minute
 * while the tab is visible and refreshed when the seller comes back to it.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: unreadKey,
    queryFn: () => api.get<number>("/notifications/unread-count"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/** Counts shown beside navigation entries. Entries that aren't built yet show none. */
export function useBadges(): Partial<Record<BadgeKey, number>> {
  const stats = useHomeStats();
  const requests = usePendingRequests();
  return { pendingOrders: stats.data?.pendingOrders, pendingRequests: requests.data ?? undefined };
}

export function badgeText(n: number) {
  return n > 99 ? "99+" : String(n);
}
