import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/AuthShell";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <AuthShell line="ورشتك، على شاشة أكبر">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
