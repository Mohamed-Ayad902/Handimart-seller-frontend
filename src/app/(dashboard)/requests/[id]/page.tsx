import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestDetail } from "@/features/requests/RequestDetail";

export const metadata: Metadata = { title: "طلب تفصيل" };

const ID = /^[0-9a-fA-F-]{36}$/;

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  return <RequestDetail key={id} id={id} />;
}
