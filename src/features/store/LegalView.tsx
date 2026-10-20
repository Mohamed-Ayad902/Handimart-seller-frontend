"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { formatDate } from "@/lib/format";
import type { LegalDocument } from "@/lib/types";
import { useLegal } from "./api";

/** A policy as the backend serves it: plain text, one paragraph per blank-line block. */
export function LegalView({ type, fallbackTitle }: { type: LegalDocument["type"]; fallbackTitle: string }) {
  const router = useRouter();
  const doc = useLegal(type);
  const paragraphs = doc.data?.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-6">
      <button type="button" onClick={() => (history.length > 1 ? router.back() : router.push("/store"))} className="group inline-flex w-fit min-h-11 items-center gap-1.5 text-body-sm font-bold text-ink-2 hover:text-ink">
        <ArrowRight className="size-4 transition-transform duration-standard ease-soft group-hover:translate-x-1" aria-hidden="true" />
        رجوع
      </button>

      <header className="flex flex-col gap-2 border-b border-dashed border-line-strong pb-6">
        <p className="text-meta font-bold text-accent-text">HandiMart</p>
        <h1 className="enter text-headline font-extrabold">{doc.data?.title || fallbackTitle}</h1>
        {doc.data?.updatedAt && <p className="text-body-sm text-ink-3">آخر تحديث {formatDate(doc.data.updatedAt)}</p>}
      </header>

      {doc.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="بنحمّل الصفحة">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((w, i) => (
            <Skeleton key={i} className={`h-5 ${w}`} />
          ))}
        </div>
      ) : doc.isError ? (
        <StateView illustration="tangledThread" title="معرفناش نجيب الصفحة دي" action={<Button onClick={() => doc.refetch()}>حاول مرة أخرى</Button>} />
      ) : (
        <article className="flex flex-col gap-4 text-body leading-loose text-ink-2">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </article>
      )}
    </div>
  );
}
