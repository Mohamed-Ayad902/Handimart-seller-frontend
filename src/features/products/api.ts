"use client";

import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api, upload } from "@/lib/client/api";
import type { Category, Page, Product, ProductRequest } from "@/lib/types";
import { E, tracked } from "@/lib/observability/analytics";
import { uploadBatches } from "./media";

/** Large pages: the backend has no search or status filter here, so the list filters what it has loaded (as the app does). */
export const PAGE_SIZE = 50;

export const productKeys = {
  all: ["products"] as const,
  mine: ["products", "mine"] as const,
  categories: ["categories", "tree"] as const,
};

type Pages = InfiniteData<Page<Product>, number>;

export function useMyProducts() {
  return useInfiniteQuery({
    queryKey: productKeys.mine,
    queryFn: ({ pageParam, signal }) => api.get<Page<Product>>("/seller/products/my-products", { page: pageParam, size: PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
  });
}

/**
 * One product. There is no seller GET-by-id, so it is looked up in the loaded pages, loading
 * further pages until it turns up or the list ends.
 */
export function useProduct(id: string) {
  const products = useMyProducts();
  const all = products.data?.pages.flatMap((p) => p.content) ?? [];
  const product = all.find((p) => p.id === id) ?? null;
  const exhausted = products.isSuccess && !products.hasNextPage;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = products;
  const missing = !product;
  useEffect(() => {
    if (missing && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [missing, hasNextPage, isFetchingNextPage, fetchNextPage]);
  return {
    product,
    isPending: !product && (products.isPending || hasNextPage || isFetchingNextPage),
    isError: products.isError,
    notFound: !product && exhausted,
    refetch: products.refetch,
  };
}

/** Writes a changed product into the cached pages, so list, detail and form agree without a refetch. */
function useReplaceProduct() {
  const client = useQueryClient();
  return (next: Product) => {
    client.setQueryData<Pages>(productKeys.mine, (data) =>
      data ? { ...data, pages: data.pages.map((page) => ({ ...page, content: page.content.map((p) => (p.id === next.id ? next : p)) })) } : data,
    );
  };
}

export function useSetActive() {
  const replace = useReplaceProduct();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => tracked(api.patch<Product>(`/seller/products/${id}/${active ? "activate" : "deactivate"}`), active ? E.PRODUCT_ACTIVATED : E.PRODUCT_DEACTIVATED, { product_id: id }),
    onSuccess: replace,
  });
}

/** Stock only applies to ready-made pieces; it changes the count without sending the piece back to review. */
export function useUpdateStock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => tracked(api.patch<null>(`/seller/products/${id}/stock?stock=${stock}`), E.PRODUCT_STOCK_UPDATED, { product_id: id, new_stock: stock }),
    onSuccess: (_, { id, stock }) => {
      client.setQueryData<Pages>(productKeys.mine, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                content: page.content.map((p) =>
                  p.id === id ? { ...p, stockQuantity: stock, availability: stock > 0 ? (p.availability === "OUT_OF_STOCK" ? "AVAILABLE" : p.availability) : "OUT_OF_STOCK" } : p,
                ),
              })),
            }
          : data,
      );
    },
  });
}

export interface SaveInput {
  id: string | null;
  body: ProductRequest;
  files: File[];
  /** Existing media to remove first (edit only). */
  removeMediaIds: string[];
}

/** The piece was saved, but some of its new media did not make it. */
export class PartialSaveError extends Error {
  constructor(
    readonly productId: string,
    readonly missing: number,
  ) {
    super("partial save");
  }
}

/**
 * Create or edit, as the app's upload orchestrator does it: on edit, queued photo deletions go
 * first, then the details and the new media. Media go in groups that each fit one request
 * (Vercel's body limit), the first with the create or edit and the rest as follow-up edits that
 * add to the piece. Every save goes back to review on the backend.
 */
export function useSaveProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, files, removeMediaIds }: SaveInput) => {
      const [first = [], ...rest] = uploadBatches(files);
      let saved: Product;
      if (!id) saved = await tracked(upload<Product>("/seller/products", body, first, { fileField: "images" }), E.PRODUCT_CREATION_SUCCESS, (p) => ({ product_id: p?.id }));
      else {
        for (const mediaId of removeMediaIds) await api.delete<null>(`/seller/products/${id}/images/${mediaId}`);
        saved = await tracked(upload<Product>(`/seller/products/${id}`, body, first, { fileField: "images", method: "PUT" }), E.PRODUCT_RESUBMITTED, { product_id: id });
      }
      const productId = saved?.id ?? id!;
      for (let i = 0; i < rest.length; i++) {
        try {
          saved = await upload<Product>(`/seller/products/${productId}`, body, rest[i]!, { fileField: "images", method: "PUT" });
        } catch {
          throw new PartialSaveError(productId, rest.slice(i).reduce((n, batch) => n + batch.length, 0));
        }
      }
      return saved;
    },
    onSettled: () => client.invalidateQueries({ queryKey: productKeys.mine }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: ({ signal }) => api.get<Category[]>("/categories/tree", undefined, signal),
    staleTime: 30 * 60_000,
  });
}

/** Active categories as a flat list with their path ("مشغولات › فخار"), for a single select. */
export function flattenCategories(tree: Category[], trail: string[] = []): { id: string; label: string }[] {
  return tree
    .filter((c) => c.isActive)
    .flatMap((c) => {
      const path = [...trail, c.name];
      return [{ id: c.id, label: path.join(" › ") }, ...flattenCategories(c.children ?? [], path)];
    });
}
