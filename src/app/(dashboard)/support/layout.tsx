import { Suspense } from "react";
import { SupportShell } from "@/features/support/SupportInbox";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SupportShell>{children}</SupportShell>
    </Suspense>
  );
}
