"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/client/api";
import type { Seller } from "@/lib/types";

export const SELLER_KEY = ["seller", "me"] as const;

/** The signed-in seller (`GET auth/seller/me` via the session route), or null when signed out. */
export function useSeller() {
  return useQuery({ queryKey: SELLER_KEY, queryFn: () => authApi.me(), staleTime: 60_000 });
}

/**
 * Where a seller belongs, from the same fields the app's splash routes on (`SplashVM.kt`):
 * ACTIVE works in the dashboard; everyone else sees their account status. Onboarding on the web
 * is a later phase, so ONBOARDING also lands on the status page, which explains what to do.
 */
export function homeFor(seller: Seller | null): string {
  if (!seller) return "/login";
  return seller.accountStatus === "ACTIVE" ? "/" : "/status";
}

/** True while the account is inside its deletion grace period (the app's reactivation prompt). */
export function deletionPending(seller: Seller | null): boolean {
  return Boolean(seller?.user?.deletionRequestedAt || seller?.user?.accountState === "SCHEDULED_FOR_DELETION");
}

export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    // Whatever the backend answered, this browser's session cookies are cleared by the route.
    onSettled: () => {
      client.clear();
      router.replace("/login");
    },
  });
}
