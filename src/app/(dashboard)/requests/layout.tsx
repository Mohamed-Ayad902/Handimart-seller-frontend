import { RequestsShell } from "@/features/requests/RequestsInbox";

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return <RequestsShell>{children}</RequestsShell>;
}
