import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "استرجاع كلمة السر" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell line="الخيط مبيضيعش">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
