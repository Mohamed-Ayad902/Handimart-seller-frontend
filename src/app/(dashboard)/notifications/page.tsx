import type { Metadata } from "next";
import { NotificationsView } from "@/features/notifications/NotificationsView";

export const metadata: Metadata = { title: "الإشعارات" };

export default function NotificationsPage() {
  return <NotificationsView />;
}
