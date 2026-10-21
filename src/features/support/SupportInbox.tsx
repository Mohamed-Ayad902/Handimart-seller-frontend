"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Lifebuoy, Paperclip, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea, TextField } from "@/components/ui/Field";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMark } from "@/components/ui/StatusTag";
import { ApiError } from "@/lib/client/api";
import { formatAgo, formatCount } from "@/lib/format";
import type { SupportContextType, SupportConversation } from "@/lib/types";
import { useConversations, useStartConversation } from "./api";
import { ATTACH_ACCEPT, CONTEXT_LABEL, STATUS_LABEL, SUBJECT_MAX, TEXT_MAX, prepareAttachment } from "./attachment";

const CONTEXTS: SupportContextType[] = ["GENERAL", "BOOST_PAYMENT", "PAYOUT_ISSUE", "ORDER", "RETURN"];
const ID = /^[0-9a-fA-F-]{36}$/;

/** Inbox beside the open chat on wide screens; one at a time on phones. */
export function SupportShell({ children }: { children: ReactNode }) {
  const openId = useSelectedLayoutSegment();
  const conversations = useConversations();
  const unread = conversations.data?.pages.flatMap((p) => p.content).filter((c) => c.unreadCount > 0).length ?? 0;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Other pages can open the composer pre-filled (`/support?new=1&context=PAYOUT_ISSUE`).
  const [starting, setStarting] = useState(params.get("new") === "1");

  return (
    <div className="flex flex-col gap-6">
      <header className={`flex flex-wrap items-end justify-between gap-4 ${openId ? "max-lg:hidden" : ""}`}>
        <div>
          <p className="enter text-meta font-bold text-accent-text">{unread ? `${formatCount(unread)} محادثة فيها رد جديد` : "إحنا معاك"}</p>
          <h1 className="enter text-headline font-extrabold" style={{ "--i": 1 } as React.CSSProperties}>
            الدعم
          </h1>
        </div>
        <Button onClick={() => setStarting(true)}>
          <Plus className="size-5" aria-hidden="true" />
          ابدأ محادثة جديدة
        </Button>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(19rem,24rem)_1fr]">
        <div className={openId ? "max-lg:hidden" : undefined}>
          <Inbox openId={openId} onStart={() => setStarting(true)} />
        </div>
        <div className={openId ? undefined : "max-lg:hidden"}>{children}</div>
      </div>
      <StartDialog
        open={starting}
        onClose={() => {
          setStarting(false);
          if (params.has("new")) router.replace(pathname, { scroll: false });
        }}
        initialContext={params.get("context")}
        initialRef={params.get("ref")}
      />
    </div>
  );
}

function Inbox({ openId, onStart }: { openId: string | null; onStart: () => void }) {
  const conversations = useConversations();
  if (conversations.isPending)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  if (conversations.isError) return <SectionError message="معرفناش نجيب محادثاتك." />;
  const list = conversations.data.pages.flatMap((p) => p.content);
  if (!list.length)
    return (
      <div className="flex flex-col items-center gap-3 rounded-image bg-surface p-8 text-center">
        <Lifebuoy className="size-10 text-ink-3" aria-hidden="true" />
        <p className="text-subtitle font-bold">مفيش محادثات لسه</p>
        <p className="text-body-sm text-ink-2">لو محتاج أي مساعدة، ابدأ محادثة جديدة مع فريق الدعم.</p>
        <Button variant="quiet" onClick={onStart}>
          ابدأ محادثة جديدة
        </Button>
      </div>
    );
  return (
    <section aria-label="محادثاتك" className="lg:sticky lg:top-24">
      <ul className="overflow-hidden rounded-image border border-line bg-surface">
        {list.map((c) => (
          <li key={c.id} className="border-b border-dashed border-line last:border-0">
            <Row conversation={c} active={c.id === openId} />
          </li>
        ))}
      </ul>
      {conversations.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button variant="quiet" onClick={() => void conversations.fetchNextPage()} disabled={conversations.isFetchingNextPage}>
            {conversations.isFetchingNextPage && <Spinner />}
            اعرض أقدم
          </Button>
        </div>
      )}
    </section>
  );
}

function Row({ conversation: c, active }: { conversation: SupportConversation; active: boolean }) {
  const s = STATUS_LABEL[c.status] ?? STATUS_LABEL.OPEN!;
  const unread = c.unreadCount > 0;
  return (
    <Link href={`/support/${c.id}`} aria-current={active ? "page" : undefined} className={`relative flex flex-col gap-1 px-4 py-3 transition-colors duration-quick hover:bg-paper ${active ? "bg-paper" : ""}`}>
      {active && <span aria-hidden="true" className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary" />}
      <span className="flex items-center justify-between gap-2">
        <span className={`truncate text-body-sm ${unread ? "font-extrabold" : "font-bold"}`}>{c.subject || "استفسار عام"}</span>
        <span className="shrink-0 text-meta text-ink-3">{formatAgo(c.lastMessageAt ?? c.createdAt)}</span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className={`line-clamp-1 text-meta ${unread ? "font-bold text-ink" : "text-ink-2"}`}>{c.lastMessagePreview ?? ""}</span>
        {unread ? (
          <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-extrabold text-on-primary" aria-label={`${c.unreadCount} رسالة جديدة`}>
            {c.unreadCount > 99 ? "99+" : c.unreadCount}
          </span>
        ) : (
          <StatusMark tone={s.tone} className="text-meta">
            {s.label}
          </StatusMark>
        )}
      </span>
      {c.contextType && CONTEXT_LABEL[c.contextType] && <span className="text-meta text-ink-3">بخصوص: {CONTEXT_LABEL[c.contextType]}</span>}
    </Link>
  );
}

function StartDialog({ open, onClose, initialContext, initialRef }: { open: boolean; onClose: () => void; initialContext: string | null; initialRef: string | null }) {
  const start = useStartConversation();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const context: SupportContextType = CONTEXTS.includes(initialContext as SupportContextType) ? (initialContext as SupportContextType) : "GENERAL";
  const ref = initialRef && ID.test(initialRef) ? initialRef : null;

  const textError = !text.trim() && !file ? "اكتب رسالتك أو ارفق ملف" : text.trim().length > TEXT_MAX ? `الحد الأقصى ${TEXT_MAX} حرف` : null;
  const subjectError = subject.trim().length > SUBJECT_MAX ? `الحد الأقصى ${SUBJECT_MAX} حرف` : null;

  const close = () => {
    if (start.isPending) return;
    start.reset();
    setTouched(false);
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (textError || subjectError || start.isPending) return;
    start.mutate(
      { subject: subject.trim() || null, contextType: context, contextRefId: ref, text: text.trim() || null, attachment: file },
      {
        onSuccess: (c) => {
          setSubject("");
          setText("");
          setFile(null);
          setTouched(false);
          onClose();
          if (c?.id) router.push(`/support/${c.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} title="محادثة جديدة" locked={start.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-ink-2">اكتب استفسارك وهنرد عليك في أقرب وقت.</p>
        {context !== "GENERAL" && <p className="rounded-tag bg-surface-sunken px-3 py-2 text-meta font-bold">بخصوص: {CONTEXT_LABEL[context]}</p>}
        <TextField id="support-subject" label="الموضوع (اختياري)" placeholder="مثال: استفسار عن السحب" value={subject} maxLength={SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} error={subjectError} disabled={start.isPending} />
        <TextArea id="support-text" label="رسالتك" placeholder="اكتب تفاصيل استفسارك هنا..." value={text} maxLength={TEXT_MAX} onChange={(e) => setText(e.target.value)} error={touched ? textError : null} disabled={start.isPending} />
        <div className="flex flex-wrap items-center gap-3">
          {file ? (
            <span className="inline-flex items-center gap-2 rounded-tag bg-surface-sunken px-3 py-1.5 text-meta font-bold">
              <Paperclip className="size-4" aria-hidden="true" />
              <span className="max-w-48 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="شيل المرفق" className="grid size-6 place-items-center rounded-full hover:bg-line">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <Button variant="quiet" className="min-h-10 px-4 text-body-sm" onClick={() => input.current?.click()} disabled={start.isPending}>
              <Paperclip className="size-4" aria-hidden="true" />
              ارفق صورة أو PDF
            </Button>
          )}
          <input
            ref={input}
            type="file"
            hidden
            accept={ATTACH_ACCEPT}
            onChange={async (e) => {
              const picked = e.target.files?.[0];
              e.target.value = "";
              if (!picked) return;
              const out = await prepareAttachment(picked);
              if ("error" in out) setFileError(out.error);
              else {
                setFileError(null);
                setFile(out.file);
              }
            }}
          />
          {fileError && (
            <p role="alert" className="text-meta font-semibold text-error">
              {fileError}
            </p>
          )}
        </div>
        {start.isError && (
          <p role="alert" className="text-body-sm font-semibold text-error">
            {start.error instanceof ApiError ? start.error.message : "حصلت مشكلة. جرّب تاني بعد شوية."}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="quiet" onClick={close} disabled={start.isPending}>
            رجوع
          </Button>
          <Button type="submit" disabled={start.isPending} aria-busy={start.isPending}>
            {start.isPending && <Spinner />}
            ابعت
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
