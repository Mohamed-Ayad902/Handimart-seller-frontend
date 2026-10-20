import type { Metadata } from "next";
import { HomeView } from "@/features/home/HomeView";

export const metadata: Metadata = { title: "الرئيسية" };

export default function HomePage() {
  return <HomeView />;
}
