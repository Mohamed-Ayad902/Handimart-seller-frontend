import type { Metadata } from "next";
import { WalletView } from "@/features/wallet/WalletView";

export const metadata: Metadata = { title: "المحفظة" };

export default function WalletPage() {
  return <WalletView />;
}
