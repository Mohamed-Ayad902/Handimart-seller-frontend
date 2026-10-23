"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/client/api";
import type { Seller } from "@/lib/types";
import { E, track } from "@/lib/observability/analytics";
import { disablePush } from "@/lib/observability/push";

export const SELLER_KEY = ["seller", "me"] as const;

/** The signed-in seller (`GET auth/seller/me` via the session route), or null when signed out. */
export function useSeller() {
  return useQuery({ queryKey: SELLER_KEY, queryFn: () => authApi.me(), staleTime: 60_000 });
}

/**
 * Where a seller belongs, from the same fields the app's splash routes on (`SplashVM.kt`):
 * ACTIVE works in the dashboard, ONBOARDING finishes registering, everyone else sees their
 * account status.
 */
export function homeFor(seller: Seller | null): string {
  if (!seller) return "/login";
  if (seller.accountStatus === "ONBOARDING") return "/register";
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
    mutationFn: async () => {
      track(E.LOGOUT);
      // This browser stops getting the seller's pushes before the session (and its token) goes.
      await disablePush();
      return authApi.logout();
    },
    // Whatever the backend answered, this browser's session cookies are cleared by the route.
    onSettled: () => {
      client.clear();
      router.replace("/login");
    },
  });
}
