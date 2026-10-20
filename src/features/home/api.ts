"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { Banner, HomeStats, ReviewSummary, TopProduct, Wallet } from "@/lib/types";

/** One bucket of the earnings chart (`EarningsBucketResponse`): daily, or hourly for one day. */
export interface EarningsBucket {
  date: string;
  hour: number | null;
  amount: number;
}

export const homeKeys = {
  stats: ["home", "stats"] as const,
  top: ["home", "top-products"] as const,
  banners: ["home", "banners"] as const,
  wallet: ["finance", "wallet"] as const,
  earnings: (range: string) => ["finance", "earnings", range] as const,
  reviews: ["reviews", "summary"] as const,
  requests: ["custom-requests", "pending-count"] as const,
};

/** The home screen's parallel calls (app `HomeViewModel`), each loading and failing on its own. */
export const useHomeStats = () => useQuery({ queryKey: homeKeys.stats, queryFn: () => api.get<HomeStats>("/seller/home/stats") });
export const useTopProducts = () => useQuery({ queryKey: homeKeys.top, queryFn: () => api.get<TopProduct[]>("/seller/home/top-products", { limit: 4 }) });
export const useBanners = () => useQuery({ queryKey: homeKeys.banners, queryFn: () => api.get<Banner[]>("/seller/home/banners"), staleTime: 5 * 60_000 });
export const useWallet = () => useQuery({ queryKey: homeKeys.wallet, queryFn: () => api.get<Wallet>("/seller/finance/wallet") });
export const useWeekEarnings = () =>
  useQuery({ queryKey: homeKeys.earnings("LAST_7_DAYS"), queryFn: () => api.get<EarningsBucket[]>("/seller/finance/earnings-chart", { range: "LAST_7_DAYS" }) });
export const useReviewSummary = () => useQuery({ queryKey: homeKeys.reviews, queryFn: () => api.get<ReviewSummary>("/seller/reviews/summary") });
export const usePendingRequests = () => useQuery({ queryKey: homeKeys.requests, queryFn: () => api.get<number>("/seller/custom-requests/pending-count") });
