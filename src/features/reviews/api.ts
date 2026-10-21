"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { Page, Review, ReviewFilters, ReviewFlagReason } from "@/lib/types";
import { homeKeys, useReviewSummary } from "@/features/home/api";

const PAGE = 15;

export const reviewKeys = {
  all: ["reviews"] as const,
  list: (f: ReviewFilters, page: number) => ["reviews", "list", f, page] as const,
};

export { useReviewSummary };

/** `GET /seller/reviews`: `replied=false` is the "waiting on you" inbox. */
export function useReviews(filters: ReviewFilters, page: number) {
  return useQuery({
    queryKey: reviewKeys.list(filters, page),
    queryFn: ({ signal }) =>
      api.get<Page<Review>>(
        "/seller/reviews",
        { page, size: PAGE, sort: filters.sort, rating: filters.rating, withPhotos: filters.withPhotos || undefined, replied: filters.replied, productId: filters.productId },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}

/** Reply (create or edit), delete the reply, report. Each refreshes the list and the summary counts. */
export function useReviewActions() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: reviewKeys.all });
    void client.invalidateQueries({ queryKey: homeKeys.reviews });
  };
  return {
    reply: useMutation({ mutationFn: ({ id, reply }: { id: string; reply: string }) => api.put<Review>(`/seller/reviews/${id}/reply`, { reply }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete<Review>(`/seller/reviews/${id}/reply`), onSuccess: refresh }),
    report: useMutation({ mutationFn: ({ id, reason, note }: { id: string; reason: ReviewFlagReason; note: string | null }) => api.post<null>(`/seller/reviews/${id}/report`, { reason, note }) }),
  };
}
