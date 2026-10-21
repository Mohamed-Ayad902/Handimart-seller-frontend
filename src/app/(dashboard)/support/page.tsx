import type { Metadata } from "next";
import { Lifebuoy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "الدعم" };

export default function SupportPage() {
  return (
    <div className="hidden h-full min-h-80 flex-col items-center justify-center gap-3 rounded-image-lg border-[1.5px] border-dashed border-line-strong p-10 text-center lg:flex">
      <Lifebuoy className="size-12 text-ink-3" aria-hidden="true" />
      <p className="text-subtitle font-bold">اختار محادثة أو ابدأ واحدة جديدة</p>
      <p className="max-w-sm text-body-sm text-ink-2">فريق HandiMart بيرد هنا على أسئلتك عن الطلبات والفلوس والترويج.</p>
    </div>
  );
}
