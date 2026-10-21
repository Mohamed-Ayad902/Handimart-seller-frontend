import type { Metadata } from "next";
import { DiscountsView } from "@/features/discounts/DiscountsView";

export const metadata: Metadata = { title: "العروض والخصومات" };

export default function DiscountsPage() {
  return <DiscountsView />;
}
