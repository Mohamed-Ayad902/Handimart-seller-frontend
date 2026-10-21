"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { Discount, DiscountRequest, Page, Product } from "@/lib/types";
import { productKeys } from "@/features/products/api";

export const discountKeys = {
  all: ["discounts"] as const,
  pickable: ["discounts", "products"] as const,
};

export function useDiscounts() {
  return useInfiniteQuery({
    queryKey: discountKeys.all,
    queryFn: ({ pageParam, signal }) => api.get<Page<Discount>>("/seller/discounts", { page: pageParam, size: 20 }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/** The pieces an offer can cover, in one go like the app (first 100). */
export function usePickableProducts(enabled: boolean) {
  return useQuery({
    queryKey: discountKeys.pickable,
    queryFn: ({ signal }) => api.get<Page<Product>>("/seller/products/my-products", { page: 0, size: 100 }, signal),
    enabled,
    staleTime: 60_000,
  });
}

/** Every change moves product prices server-side, so the product lists are refreshed too. */
function useInvalidate() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: discountKeys.all });
    void client.invalidateQueries({ queryKey: productKeys.all });
  };
}

export function useSaveDiscount() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: DiscountRequest }) => (id ? api.put<Discount>(`/seller/discounts/${id}`, body) : api.post<Discount>("/seller/discounts", body)),
    onSuccess: done,
  });
}

export function useToggleDiscount() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => api.patch<null>(`/seller/discounts/${id}/${on ? "activate" : "deactivate"}`),
    onSettled: done,
  });
}

export function useDeleteDiscount() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/seller/discounts/${id}`),
    onSuccess: done,
  });
}
