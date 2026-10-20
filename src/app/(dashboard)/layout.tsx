import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/features/shell/DashboardShell";
import { REFRESH_COOKIE } from "@/server/session";

/** No session cookie at all: straight to sign-in, before any dashboard code is sent. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!jar.get(REFRESH_COOKIE)?.value) redirect("/login");
  return <DashboardShell>{children}</DashboardShell>;
}
