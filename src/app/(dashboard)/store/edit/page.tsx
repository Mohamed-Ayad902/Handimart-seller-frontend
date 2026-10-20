import type { Metadata } from "next";
import { StoreForm } from "@/features/store/StoreForm";

export const metadata: Metadata = { title: "تعديل بيانات المتجر" };

export default function EditStorePage() {
  return <StoreForm />;
}
