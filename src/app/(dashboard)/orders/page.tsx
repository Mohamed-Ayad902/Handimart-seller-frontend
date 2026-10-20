import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/features/orders/OrdersView";

export const metadata: Metadata = { title: "الطلبات" };

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
