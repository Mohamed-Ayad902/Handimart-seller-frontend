"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import type { GoalsOverview } from "@/lib/types";

export const goalKeys = { overview: ["goals"] as const };

export function useGoals() {
  return useQuery({ queryKey: goalKeys.overview, queryFn: ({ signal }) => api.get<GoalsOverview>("/seller/goals", undefined, signal) });
}

/** The unlocked moment was shown: hide it at once, then tell the server so it never comes back. */
export function useMarkRewardSeen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<null>(`/seller/goals/rewards/${id}/seen`),
    onMutate: (id) => {
      client.setQueryData<GoalsOverview>(goalKeys.overview, (d) => (d ? { ...d, rewards: d.rewards.map((r) => (r.id === id ? { ...r, seen: true } : r)) } : d));
    },
  });
}
