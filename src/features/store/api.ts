"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, upload } from "@/lib/client/api";
import type { Category, LegalDocument, PayoutMethod, RegionItem, Seller, StoreRequest, Wallet } from "@/lib/types";
import { SELLER_KEY } from "@/features/auth/session";
import { homeKeys } from "@/features/home/api";

/** Vacation mode is set to an explicit state (the backend's idempotent PUT), never toggled. */
export function useVacationMode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.put<boolean>(`/seller/profile/vacation-mode?enabled=${enabled}`),
    onSuccess: (on) => {
      client.setQueryData<Seller | null>(SELLER_KEY, (s) => (s?.store ? { ...s, store: { ...s.store, vacationMode: on } } : s));
    },
  });
}

export function useSavePayout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutMethod: PayoutMethod; accountIdentifier: string }) => api.put<null>("/seller/profile/payout-method", input),
    onSuccess: (_, input) => {
      client.setQueryData<Wallet>(homeKeys.wallet, (w) => (w ? { ...w, payoutMethod: input.payoutMethod, payoutAccountIdentifier: input.accountIdentifier } : w));
    },
  });
}

/** Pieces the workshop can make at the same time; used for delivery estimates. Write-only: no endpoint returns it. */
export function useSaveCapacity() {
  return useMutation({ mutationFn: (capacity: number) => api.patch<null>(`/seller/products/capacity?capacity=${capacity}`) });
}

export function useRequestDeletion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<null>("/auth/seller/account/request-deletion"),
    onSuccess: () => client.invalidateQueries({ queryKey: SELLER_KEY }),
  });
}

/** Store details, logo and banner. Images are only sent when the seller picked new ones. */
export function useSaveStore(path: "/seller/profile/store-info" | "/auth/seller/store-info" = "/seller/profile/store-info") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ body, logo, banner }: { body: StoreRequest; logo: File | null; banner: File | null }) => {
      const parts: [string, File][] = [];
      if (logo) parts.push(["logo", logo]);
      if (banner) parts.push(["banner", banner]);
      return upload<Seller>(path, body, parts);
    },
    onSuccess: (seller) => {
      if (seller) client.setQueryData(SELLER_KEY, seller);
      else void client.invalidateQueries({ queryKey: SELLER_KEY });
    },
  });
}

export function useRegions(parentId: string | null) {
  return useQuery({
    queryKey: ["regions", parentId ?? "root"],
    queryFn: ({ signal }) => api.get<RegionItem[]>(parentId ? `/regions/${parentId}/children` : "/regions", undefined, signal),
    staleTime: 60 * 60_000,
  });
}

/** All active categories, flat (`GET /categories`): the app offers every one as a store chip. */
export function useStoreCategories() {
  return useQuery({
    queryKey: ["categories", "flat"],
    queryFn: ({ signal }) => api.get<Category[]>("/categories", undefined, signal),
    staleTime: 30 * 60_000,
    select: (list) => list.filter((c) => c.isActive),
  });
}

export function useLegal(type: LegalDocument["type"]) {
  return useQuery({
    queryKey: ["legal", type],
    queryFn: ({ signal }) => api.get<LegalDocument>(`/legal/${type}`, undefined, signal),
    staleTime: 60 * 60_000,
  });
}

export const PAYOUT: Record<PayoutMethod, { label: string; hint: string; placeholder: string }> = {
  INSTAPAY: { label: "إنستاباي", hint: "عنوان الدفع بتاعك على إنستاباي", placeholder: "example@instapay" },
  MOBILE_WALLET: { label: "محفظة إلكترونية", hint: "رقم المحفظة (فودافون كاش أو غيرها)", placeholder: "01xxxxxxxxx" },
  BANK_TRANSFER: { label: "تحويل بنكي", hint: "رقم الحساب البنكي", placeholder: "رقم الحساب البنكي" },
};
