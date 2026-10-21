"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FilePdf, Paperclip, PaperPlaneRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/ConfirmDialog";
import { SectionError } from "@/components/ui/SectionError";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateView } from "@/components/ui/StateView";
import { StatusTag } from "@/components/ui/StatusTag";
import { ApiError } from "@/lib/client/api";
import type { SupportConversation, SupportMessage } from "@/lib/types";
import { dayLabel, groupByDay } from "@/features/wallet/ledger";
import { useConversations, useMarkRead, useMessages, useSendMessage } from "./api";
import { ATTACH_ACCEPT, CONTEXT_LABEL, STATUS_LABEL, TEXT_MAX, prepareAttachment } from "./attachment";

const time = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" });

export function SupportChat({ id }: { id: string }) {
  const conversations = useConversations();
  const conversation = conversations.data?.pages.flatMap((p) => p.content).find((c) => c.id === id) ?? null;
  const messages = useMessages(id);
  const markRead = useMarkRead();
  const list = useMemo(() => (messages.data?.pages.flatMap((p) => p.content) ?? []).slice().reverse(), [messages.data]);
  const newest = list.at(-1);

  // Reading the chat clears its unread mark, again whenever support answers while it is open.
  const { mutate: mark } = markRead;
  const unread = conversation?.unreadCount ?? 0;
  useEffect(() => {
    if (newest && (newest.senderRole !== "SELLER" || unread > 0)) mark(id);
  }, [id, newest, unread, mark]);

  if (messages.isError) {
    const gone = messages.error instanceof ApiError && (messages.error.status === 404 || messages.error.status === 403);
    return gone ? (
      <StateView illustration="threadSearch" title="المحادثة دي مش موجودة" action={<BackLink />} />
    ) : (
      <SectionError message="معرفناش نفتح المحادثة. جرّب تاني بعد شوية." />
    );
  }

  return (
    <section aria-label="محادثة الدعم" className="page-enter flex h-[calc(100dvh-14.5rem)] min-h-[26rem] flex-col overflow-hidden rounded-image-lg border border-line bg-surface max-lg:h-[calc(100dvh-10.5rem)]">
      <ChatHeader conversation={conversation} />
      <Thread messages={list} loading={messages.isPending} hasOlder={!!messages.hasNextPage} loadingOlder={messages.isFetchingNextPage} onOlder={() => void messages.fetchNextPage()} />
      <Composer id={id} closed={conversation?.status === "CLOSED"} />
    </section>
  );
}

function BackLink() {
  return (
    <Link href="/support" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-bold hover:text-accent-text">
      <ArrowRight className="size-4" aria-hidden="true" />
      كل المحادثات
    </Link>
  );
}

function ChatHeader({ conversation: c }: { conversation: SupportConversation | null }) {
  const s = c ? (STATUS_LABEL[c.status] ?? STATUS_LABEL.OPEN!) : null;
  return (
    <header className="flex items-center gap-3 border-b border-dashed border-line px-4 py-3">
      <Link href="/support" aria-label="كل المحادثات" className="grid size-10 place-items-center rounded-full hover:bg-surface-sunken lg:hidden">
        <ArrowRight className="size-5" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-meta font-bold text-accent-text">مع فريق HandiMart{c?.assignedAdminName ? ` · ${c.assignedAdminName}` : ""}</p>
        <h2 className="truncate text-subtitle font-extrabold">{c?.subject || "محادثة الدعم"}</h2>
        {c?.contextType && CONTEXT_LABEL[c.contextType] && <p className="text-meta text-ink-3">بخصوص: {CONTEXT_LABEL[c.contextType]}</p>}
      </div>
      {s && <StatusTag tone={s.tone}>{s.label}</StatusTag>}
    </header>
  );
}

function Thread({ messages, loading, hasOlder, loadingOlder, onOlder }: { messages: SupportMessage[]; loading: boolean; hasOlder: boolean; loadingOlder: boolean; onOlder: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;
  const stick = useRef(true);

  // Follow new messages only while the seller is reading the bottom of the thread.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  return (
    <div
      ref={scroller}
      data-lenis-prevent=""
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto overscroll-contain bg-paper/60 px-3 py-4 sm:px-5"
      role="log"
      aria-live="polite"
      aria-label="الرسائل"
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="ms-auto h-14 w-1/2" />
          <Skeleton className="h-20 w-3/5" />
        </div>
      ) : (
        <>
          {hasOlder && (
            <div className="mb-4 flex justify-center">
              <Button variant="quiet" className="min-h-9 px-4 text-meta" onClick={onOlder} disabled={loadingOlder}>
                {loadingOlder && <Spinner />}
                رسائل أقدم
              </Button>
            </div>
          )}
          {groupByDay(messages, (m) => m.createdAt).map((g) => (
            <div key={g.day} className="flex flex-col gap-2">
              <p className="my-2 flex items-center gap-3 text-meta font-bold text-ink-3">
                <span className="stitch flex-1 opacity-60" aria-hidden="true" />
                {dayLabel(g.day)}
                <span className="stitch flex-1 opacity-60" aria-hidden="true" />
              </p>
              {g.items.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Bubble({ message: m }: { message: SupportMessage }) {
  const mine = m.senderRole === "SELLER";
  const system = m.senderRole === "SYSTEM";
  if (system) return <p className="mx-auto max-w-sm rounded-full bg-surface-sunken px-3 py-1 text-center text-meta text-ink-2">{m.text}</p>;
  const pdf = m.attachmentType?.includes("pdf") || m.attachmentUrl?.toLowerCase().includes(".pdf");
  return (
    <div className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${mine ? "self-end items-end" : "self-start items-start"}`}>
      {!mine && <p className="mb-0.5 px-1 text-[0.6875rem] font-bold text-ink-3">{m.senderName ?? "فريق HandiMart"}</p>}
      <div className={`rounded-[18px] px-3.5 py-2.5 ${mine ? "rounded-ee-[6px] bg-secondary text-on-secondary" : "rounded-es-[6px] border border-line bg-surface text-ink"}`}>
        {m.attachmentUrl &&
          (pdf ? (
            <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mb-1 inline-flex items-center gap-2 text-body-sm font-bold underline underline-offset-4">
              <FilePdf className="size-5" aria-hidden="true" />
              ملف PDF
            </a>
          ) : (
            <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="relative mb-1 block h-44 w-56 max-w-full overflow-hidden rounded-[12px] bg-surface-sunken">
              <Image src={m.attachmentUrl} alt="مرفق" fill unoptimized sizes="224px" className="object-cover" />
            </a>
          ))}
        {m.text && <p className="text-body-sm whitespace-pre-line [overflow-wrap:anywhere]">{m.text}</p>}
      </div>
      <p className="mt-0.5 px-1 text-[0.6875rem] text-ink-3">
        {time.format(new Date(m.createdAt))}
        {mine && m.readAt && " · اتقرت"}
      </p>
    </div>
  );
}

function Composer({ id, closed }: { id: string; closed: boolean }) {
  const send = useSendMessage(id);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const t = text.trim();
    if ((!t && !file) || send.isPending) return;
    if (t.length > TEXT_MAX) {
      setError(`الحد الأقصى ${TEXT_MAX} حرف`);
      return;
    }
    setError(null);
    send.mutate(
      { text: t || null, attachment: file },
      {
        onSuccess: () => {
          setText("");
          setFile(null);
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "الرسالة موصلتش. جرّب تاني."),
      },
    );
  };

  if (closed) return <p className="border-t border-dashed border-line px-4 py-4 text-center text-body-sm text-ink-2">المحادثة دي اتقفلت. لو محتاج حاجة تانية ابدأ محادثة جديدة.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-dashed border-line p-3"
    >
      {file && (
        <span className="mb-2 inline-flex items-center gap-2 rounded-tag bg-surface-sunken px-3 py-1.5 text-meta font-bold">
          <Paperclip className="size-4" aria-hidden="true" />
          <span className="max-w-48 truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label="شيل المرفق" className="grid size-6 place-items-center rounded-full hover:bg-line">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      )}
      {error && (
        <p role="alert" className="mb-2 text-meta font-semibold text-error">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={send.isPending} aria-label="ارفق صورة أو PDF" className="grid size-12 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken hover:text-ink">
          <Paperclip className="size-5" aria-hidden="true" />
        </button>
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
            if ("error" in out) setError(out.error);
            else {
              setError(null);
              setFile(out.file);
            }
          }}
        />
        <label htmlFor="chat-text" className="sr-only">
          رسالتك
        </label>
        <textarea
          id="chat-text"
          rows={1}
          value={text}
          maxLength={TEXT_MAX}
          placeholder="اكتب رسالتك..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-12 flex-1 resize-none rounded-control border border-line-strong bg-surface px-3.5 py-3 text-body-sm [field-sizing:content] focus:border-ink"
        />
        <button
          type="submit"
          disabled={send.isPending || (!text.trim() && !file)}
          aria-label="ابعت"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-[transform,filter] duration-quick hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {send.isPending ? <Spinner className="size-5" /> : <PaperPlaneRight weight="fill" className="size-5 -scale-x-100" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
