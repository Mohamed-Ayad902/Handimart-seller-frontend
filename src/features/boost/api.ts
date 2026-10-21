"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/client/api";
import type { BoostCampaign, BoostPaymentMethod, BoostPlan, BoostTargetType, Page, Product } from "@/lib/types";
import { homeKeys } from "@/features/home/api";
import { productKeys } from "@/features/products/api";
import { walletKeys } from "@/features/wallet/api";
import { E, track, tracked } from "@/lib/observability/analytics";

export const boostKeys = {
  plans: (target: BoostTargetType) => ["boost", "plans", target] as const,
  campaigns: ["boost", "campaigns"] as const,
  products: ["boost", "products"] as const,
};

export function useBoostPlans(target: BoostTargetType) {
  return useQuery({
    queryKey: boostKeys.plans(target),
    queryFn: ({ signal }) => api.get<BoostPlan[]>("/seller/boost/plans", { targetType: target }, signal),
    select: (plans) => plans.filter((p) => p.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    staleTime: 5 * 60_000,
  });
}

export function useBoostCampaigns() {
  return useInfiniteQuery({
    queryKey: boostKeys.campaigns,
    queryFn: ({ pageParam, signal }) => api.get<Page<BoostCampaign>>("/seller/boost/campaigns", { page: pageParam, size: 20 }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/** Only approved pieces can be boosted (the backend refuses the rest). */
export function useBoostableProducts(enabled: boolean) {
  return useQuery({
    queryKey: boostKeys.products,
    queryFn: ({ signal }) => api.get<Page<Product>>("/seller/products/my-products", { page: 0, size: 100 }, signal),
    select: (page) => page.content.filter((p) => p.approvalStatus === "APPROVED"),
    enabled,
    staleTime: 60_000,
  });
}

export function usePurchaseBoost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { planId: string; targetType: BoostTargetType; targetRefId: string | null; preferredPaymentMethod: BoostPaymentMethod }) => {
      track(E.BOOST_PAYMENT_INITIATED, { payment_method: body.preferredPaymentMethod });
      return tracked(api.post<BoostCampaign>("/seller/boost/purchase", body), E.BOOST_PURCHASE_SUCCESS, (c) => ({
        value: c?.priceSnapshot,
        currency: "EGP",
        plan_id: c?.planId ?? body.planId,
        payment_method: c?.paymentMethod ?? body.preferredPaymentMethod,
      })).catch((error: unknown) => {
        track(E.BOOST_PURCHASE_FAILED, { error_reason: error instanceof ApiError ? (error.code ?? String(error.status)) : "unknown" });
        throw error;
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: boostKeys.campaigns });
      void client.invalidateQueries({ queryKey: homeKeys.wallet });
      void client.invalidateQueries({ queryKey: walletKeys.ledger });
      void client.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
