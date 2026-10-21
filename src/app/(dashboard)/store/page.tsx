import type { Metadata } from "next";
import { StoreView } from "@/features/store/StoreView";

export const metadata: Metadata = { title: "متجري" };

export default function StorePage() {
  return <StoreView />;
}
