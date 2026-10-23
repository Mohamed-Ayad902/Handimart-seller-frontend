"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { ChartRange, LedgerEntry, Page, PayoutRequest } from "@/lib/types";
import { homeKeys, type EarningsBucket } from "@/features/home/api";
import { E, tracked } from "@/lib/observability/analytics";

const LEDGER_PAGE = 20;

export const walletKeys = {
  ledger: ["finance", "ledger"] as const,
  payouts: ["finance", "payouts"] as const,
};

/** Movements, newest first (`GET /seller/finance/ledgers`), 20 at a time like the app. */
export function useLedger() {
  return useInfiniteQuery({
    queryKey: walletKeys.ledger,
    queryFn: ({ pageParam, signal }) => api.get<Page<LedgerEntry>>("/seller/finance/ledgers", { page: pageParam, size: LEDGER_PAGE, sort: "createdAt,desc" }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/** Earnings buckets for a preset range, or a custom one once both dates are set (ISO `yyyy-mm-dd`). */
export function useEarnings(range: ChartRange, start: string | null, end: string | null) {
  const custom = range === "CUSTOM";
  return useQuery({
    queryKey: [...homeKeys.earnings(range), start, end],
    queryFn: ({ signal }) =>
      api.get<EarningsBucket[]>("/seller/finance/earnings-chart", custom ? { range, startDate: start!, endDate: end! } : { range }, signal),
    enabled: !custom || (!!start && !!end),
  });
}

/**
 * Past payout requests (`GET /seller/finance/payouts/requests`). The app has no screen for this
 * (handover G4); on the web it is the "طلبات السحب" tab, so a seller can see what was decided.
 */
export function usePayoutRequests() {
  return useInfiniteQuery({
    queryKey: walletKeys.payouts,
    queryFn: ({ pageParam, signal }) => api.get<Page<PayoutRequest>>("/seller/finance/payouts/requests", { page: pageParam, size: LEDGER_PAGE, sort: "requestedAt,desc" }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/**
 * Asks the admins to pay out part of the available balance. The backend refuses when there is
 * no payout method, a request is already pending, or the balance is short; its message is shown.
 */
export function useRequestPayout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => tracked(api.post<unknown>("/seller/finance/payouts/request", { amount }), E.PAYOUT_REQUESTED, { amount }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: homeKeys.wallet });
      void client.invalidateQueries({ queryKey: walletKeys.ledger });
      void client.invalidateQueries({ queryKey: walletKeys.payouts });
    },
  });
}
