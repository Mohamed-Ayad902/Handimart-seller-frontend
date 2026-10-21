"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { OrderFilters, Page, SellerOrder, SellerSettableStatus } from "@/lib/types";
import { homeKeys } from "@/features/home/api";
import { E, tracked } from "@/lib/observability/analytics";

export const PAGE_SIZE = 20;

export const orderKeys = {
  all: ["orders"] as const,
  list: (filters: OrderFilters, page: number) => ["orders", "list", filters, page] as const,
};

/**
 * One page of the seller's orders. The backend filters by a single `status` (it has no list
 * filter), searches customer name, phone or transaction id, and sorts newest first.
 */
export function useOrders(filters: OrderFilters, page: number) {
  return useQuery({
    queryKey: orderKeys.list(filters, page),
    queryFn: ({ signal }) => api.get<Page<SellerOrder>>("/seller/orders", { ...filters, page, size: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });
}

export interface StatusChange {
  status: SellerSettableStatus;
  /** Required when declining a new order: sent to the customer as the reason (≥ 5 characters, app rule). */
  comment?: string;
}

/**
 * Moves an order forward (or out). On success the returned order replaces the old one in every
 * cached page, so the list and the open panel agree without a refetch; counts are then refreshed.
 */
export function useUpdateOrderStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change, from }: { id: string; change: StatusChange; from?: string }) =>
      tracked(api.patch<SellerOrder>(`/seller/orders/${id}/status`, change), E.ORDER_STATUS_CHANGED, (o) => ({ order_id: id, old_status: from, new_status: o?.status })),
    onSuccess: (order) => {
      client.setQueriesData<Page<SellerOrder>>({ queryKey: ["orders", "list"] }, (page) =>
        page ? { ...page, content: page.content.map((o) => (o.id === order.id ? order : o)) } : page,
      );
      void client.invalidateQueries({ queryKey: orderKeys.all, refetchType: "inactive" });
      void client.invalidateQueries({ queryKey: homeKeys.stats });
      void client.invalidateQueries({ queryKey: homeKeys.wallet });
    },
  });
}

/** Finds an order in any cached page (there is no GET-by-id for sellers: handover gap G1). */
export function findCachedOrder(client: ReturnType<typeof useQueryClient>, id: string): SellerOrder | null {
  for (const [, page] of client.getQueriesData<Page<SellerOrder>>({ queryKey: ["orders", "list"] as QueryKey })) {
    const hit = page?.content.find((o) => o.id === id);
    if (hit) return hit;
  }
  return null;
}

/** The newest few orders, for the home screen. */
export function useRecentOrders(size = 5) {
  return useQuery({
    queryKey: ["orders", "list", { recent: true }, size] as const,
    queryFn: () => api.get<Page<SellerOrder>>("/seller/orders", { page: 0, size }),
  });
}
