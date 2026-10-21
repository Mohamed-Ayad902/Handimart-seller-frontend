import type { Metadata } from "next";
import { RegisterView } from "@/features/register/RegisterView";

export const metadata: Metadata = { title: "افتح متجرك" };

export default function RegisterPage() {
  return <RegisterView />;
}
