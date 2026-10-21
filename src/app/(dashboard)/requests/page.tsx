import type { Metadata } from "next";
import { ChatsCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "طلبات التفصيل" };

/** Wide screens: what sits beside the inbox until a request is opened. */
export default function RequestsPage() {
  return (
    <div className="hidden h-full min-h-80 flex-col items-center justify-center gap-3 rounded-image-lg border-[1.5px] border-dashed border-line-strong p-10 text-center lg:flex">
      <ChatsCircle className="size-12 text-ink-3" aria-hidden="true" />
      <p className="text-subtitle font-bold">اختار طلب عشان تشوف تفاصيله</p>
      <p className="max-w-sm text-body-sm text-ink-2">حدّد السعر والمدة، أو اسأل العميل لو محتاج توضيح، أو اعتذر لو مش هتقدر تعملها.</p>
    </div>
  );
}
