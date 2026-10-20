import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/features/products/ProductDetail";

export const metadata: Metadata = { title: "القطعة" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <ProductDetail id={id} />;
}
