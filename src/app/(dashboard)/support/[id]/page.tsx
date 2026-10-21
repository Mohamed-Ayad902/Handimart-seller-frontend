import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportChat } from "@/features/support/SupportChat";

export const metadata: Metadata = { title: "محادثة الدعم" };

const ID = /^[0-9a-fA-F-]{36}$/;

export default async function SupportChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  return <SupportChat key={id} id={id} />;
}
