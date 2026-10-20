import type { Metadata } from "next";
import { StatusView } from "@/features/account-status/StatusView";

export const metadata: Metadata = { title: "حالة حسابك" };

export default function StatusPage() {
  return <StatusView />;
}
