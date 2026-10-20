import type { Metadata } from "next";
import { ProductForm } from "@/features/products/ProductForm";

export const metadata: Metadata = { title: "قطعة جديدة" };

export default function NewProductPage() {
  return <ProductForm id={null} />;
}
