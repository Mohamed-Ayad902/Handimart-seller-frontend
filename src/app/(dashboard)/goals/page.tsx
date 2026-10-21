import type { Metadata } from "next";
import { GoalsView } from "@/features/goals/GoalsView";

export const metadata: Metadata = { title: "أهدافك" };

export default function GoalsPage() {
  return <GoalsView />;
}
