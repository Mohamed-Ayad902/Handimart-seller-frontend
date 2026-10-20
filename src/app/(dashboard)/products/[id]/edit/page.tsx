import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/products/ProductForm";

export const metadata: Metadata = { title: "تعديل قطعة" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <ProductForm id={id} />;
}
