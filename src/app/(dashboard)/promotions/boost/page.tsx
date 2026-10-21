import type { Metadata } from "next";
import { Suspense } from "react";
import { BoostView } from "@/features/boost/BoostView";

export const metadata: Metadata = { title: "روّج متجرك" };

export default function BoostPage() {
  return (
    <Suspense>
      <BoostView />
    </Suspense>
  );
}
