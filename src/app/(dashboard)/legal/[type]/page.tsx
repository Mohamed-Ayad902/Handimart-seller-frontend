import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalView } from "@/features/store/LegalView";
import type { LegalDocument } from "@/lib/types";

const TITLES: Record<LegalDocument["type"], string> = { PRIVACY_POLICY: "سياسة الخصوصية", TERMS_OF_SERVICE: "الشروط والأحكام" };

function known(type: string): type is LegalDocument["type"] {
  return type in TITLES;
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: known(type) ? TITLES[type] : "مش موجودة" };
}

/** The policies, read through the BFF (which needs a session), so they sit inside the dashboard. */
export default async function LegalPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!known(type)) notFound();
  return <LegalView type={type} fallbackTitle={TITLES[type]} />;
}
