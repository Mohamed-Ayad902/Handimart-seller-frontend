"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/client/api";
import type { ProductType, ShippingFlag } from "@/lib/types";

/**
 * "Calculate selling price" (`/seller/pricing`). The backend compares the piece with similar ones
 * sold on the platform and adds the seller's own costs when given. Every label, factor and warning
 * comes back already in Arabic, so the site shows them as they are and never makes up its own.
 */

export type PriceConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface PriceCosts {
  materialsCost?: number;
  laborHours?: number;
  packagingCost?: number;
}

export interface PriceSuggestionRequest {
  /** Editing: the backend reads the saved piece and its saved costs; the fields below override them. */
  productId?: string;
  /** New piece: required, since there is nothing saved to read it from. */
  categoryId?: string;
  productType: ProductType;
  weightKg?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  customizationCount: number;
  shippingFlags: ShippingFlag[];
  costs?: PriceCosts;
}

export interface PriceCostBreakdown {
  materials: number | null;
  laborHours: number | null;
  hourlyRate: number | null;
  labor: number | null;
  packaging: number | null;
  overheadPct: number | null;
  overhead: number | null;
  total: number | null;
}

export interface PriceSuggestion {
  suggestionId: string;
  suggestedPrice: number;
  rangeMin: number;
  rangeMax: number;
  confidence: PriceConfidence;
  confidenceLabel: string | null;
  confidenceScore: number;
  cost: PriceCostBreakdown | null;
  floorPrice: number | null;
  marketPrice: number | null;
  netProfit: number | null;
  commissionPct: number;
  comparablesCount: number;
  soldComparablesCount: number;
  factors: { key: string; impactPct: number; label: string }[];
  warnings: { key: string; message: string }[];
}

type Raw = Partial<Record<keyof PriceSuggestion, unknown>>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);

/** The response as the site uses it. A reply without an id or a price is treated as a failure, never shown half-empty. */
export function readSuggestion(raw: Raw | null): PriceSuggestion {
  const suggestionId = str(raw?.suggestionId);
  const suggestedPrice = num(raw?.suggestedPrice);
  if (!raw || !suggestionId || suggestedPrice === null || suggestedPrice <= 0) throw new ApiError("معرفناش نحسب السعر دلوقتي. جرّب تاني.", 0, "INVALID_RESPONSE");
  const confidence = str(raw.confidence);
  const cost = raw.cost && typeof raw.cost === "object" ? (raw.cost as Record<string, unknown>) : null;
  const rangeMin = num(raw.rangeMin) ?? suggestedPrice;
  const rangeMax = num(raw.rangeMax) ?? suggestedPrice;
  return {
    suggestionId,
    suggestedPrice,
    rangeMin: Math.min(rangeMin, suggestedPrice),
    rangeMax: Math.max(rangeMax, suggestedPrice),
    confidence: confidence === "HIGH" || confidence === "MEDIUM" || confidence === "LOW" ? confidence : "UNKNOWN",
    confidenceLabel: str(raw.confidenceLabel),
    confidenceScore: Math.min(1, Math.max(0, num(raw.confidenceScore) ?? 0)),
    cost: cost
      ? {
          materials: num(cost.materials),
          laborHours: num(cost.laborHours),
          hourlyRate: num(cost.hourlyRate),
          labor: num(cost.labor),
          packaging: num(cost.packaging),
          overheadPct: num(cost.overheadPct),
          overhead: num(cost.overhead),
          total: num(cost.total),
        }
      : null,
    floorPrice: num(raw.floorPrice),
    marketPrice: num(raw.marketPrice),
    netProfit: num(raw.netProfit),
    commissionPct: num(raw.commissionPct) ?? 0,
    comparablesCount: num(raw.comparablesCount) ?? 0,
    soldComparablesCount: num(raw.soldComparablesCount) ?? 0,
    // Entries the backend sent without text have nothing to say to the seller.
    factors: list(raw.factors).flatMap((f) => {
      const label = str(f.label);
      return label ? [{ key: str(f.key) ?? "UNKNOWN", impactPct: num(f.impactPct) ?? 0, label }] : [];
    }),
    warnings: list(raw.warnings).flatMap((w) => {
      const message = str(w.message);
      return message ? [{ key: str(w.key) ?? "UNKNOWN", message }] : [];
    }),
  };
}

export function useSuggestPrice() {
  return useMutation({
    mutationFn: async (body: PriceSuggestionRequest) => readSuggestion(await api.post<Raw>("/seller/pricing/suggest", body)),
  });
}

export interface AcceptInput {
  suggestionId: string;
  chosenPrice: number;
  /** Links a suggestion made before the piece existed to the piece, once it is saved. */
  productId?: string;
}

/** Records which price the seller went with. It never changes the piece's price: the form does that. */
export function useAcceptPrice() {
  return useMutation({
    mutationFn: ({ suggestionId, chosenPrice, productId }: AcceptInput) =>
      api.post<null>(`/seller/pricing/suggestions/${encodeURIComponent(suggestionId)}/accept`, { chosenPrice, productId }),
  });
}
