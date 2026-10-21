import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsView } from "@/features/reviews/ReviewsView";

export const metadata: Metadata = { title: "التقييمات" };

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsView />
    </Suspense>
  );
}
