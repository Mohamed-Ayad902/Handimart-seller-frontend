"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, upload } from "@/lib/client/api";
import type { CustomRequest, Page } from "@/lib/types";
import { homeKeys } from "@/features/home/api";
import { E, tracked } from "@/lib/observability/analytics";

const PAGE = 20;

export const requestKeys = {
  all: ["custom-requests"] as const,
  list: (pending: boolean, page: number) => ["custom-requests", "list", pending, page] as const,
  one: (id: string) => ["custom-requests", "one", id] as const,
};

/** The inbox (`GET /seller/custom-requests`): "waiting on you" only, or every request. */
export function useRequests(pending: boolean, page: number) {
  return useQuery({
    queryKey: requestKeys.list(pending, page),
    queryFn: ({ signal }) => api.get<Page<CustomRequest>>("/seller/custom-requests", { pending, page, size: PAGE }, signal),
    placeholderData: keepPreviousData,
  });
}

/** One request with its timeline. Opening it is what moves a new request to "under review" on the server. */
export function useRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.one(id),
    queryFn: ({ signal }) => api.get<CustomRequest>(`/seller/custom-requests/${id}`, undefined, signal),
  });
}

export interface OfferInput {
  unitPrice: number;
  preparationMinutes: number;
  note: string | null;
}

/** Ask, offer and decline. Each answers with the updated request, which replaces the cached one. */
export function useRequestStep(id: string) {
  const client = useQueryClient();
  const done = (updated: CustomRequest | null) => {
    if (updated) client.setQueryData(requestKeys.one(id), updated);
    void client.invalidateQueries({ queryKey: requestKeys.all });
    void client.invalidateQueries({ queryKey: homeKeys.requests });
  };
  return {
    ask: useMutation({
      mutationFn: ({ text, photos }: { text: string; photos: File[] }) => upload<CustomRequest>(`/seller/custom-requests/${id}/ask`, { text }, photos, { fileField: "photos" }),
      onSuccess: done,
    }),
    offer: useMutation({
      mutationFn: ({ offer, photos }: { offer: OfferInput; photos: File[] }) => tracked(upload<CustomRequest>(`/seller/custom-requests/${id}/offer`, offer, photos, { fileField: "photos" }), E.CUSTOM_REQUEST_OFFER_SENT, { custom_request_id: id, photo_count: photos.length }),
      onSuccess: done,
    }),
    decline: useMutation({
      mutationFn: (text: string) => tracked(api.post<CustomRequest>(`/seller/custom-requests/${id}/decline`, { text }), E.CUSTOM_REQUEST_DECLINED, { custom_request_id: id, declined_by: "seller" }),
      onSuccess: done,
    }),
  };
}
