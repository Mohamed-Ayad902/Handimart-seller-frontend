import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsView } from "@/features/products/ProductsView";

export const metadata: Metadata = { title: "المنتجات" };

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsView />
    </Suspense>
  );
}
