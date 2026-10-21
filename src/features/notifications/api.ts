"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { AppNotification, Page } from "@/lib/types";
import { unreadKey } from "@/features/shell/badges";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: ["notifications", "list"] as const,
  latest: ["notifications", "latest"] as const,
};

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam, signal }) => api.get<Page<AppNotification>>("/notifications", { page: pageParam, size: 20 }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/** The few newest, for the bell's dropdown; fetched only while it is open. */
export function useLatestNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.latest,
    queryFn: ({ signal }) => api.get<Page<AppNotification>>("/notifications", { page: 0, size: 6 }, signal),
    enabled,
  });
}

/** Marks read optimistically, so the dot goes the moment the seller opens it. */
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<null>(`/notifications/${id}/read`),
    onMutate: (id) => {
      client.setQueryData<InfiniteData<Page<AppNotification>>>(notificationKeys.list, (d) =>
        d ? { ...d, pages: d.pages.map((p) => ({ ...p, content: p.content.map((n) => (n.id === id ? { ...n, isRead: true } : n)) })) } : d,
      );
      client.setQueryData<Page<AppNotification>>(notificationKeys.latest, (p) => (p ? { ...p, content: p.content.map((n) => (n.id === id ? { ...n, isRead: true } : n)) } : p));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: unreadKey });
    },
  });
}

export function useMarkAllRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<number>("/notifications/read-all"),
    onSuccess: () => {
      client.setQueryData(unreadKey, 0);
      void client.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
