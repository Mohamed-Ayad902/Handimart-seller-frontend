"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ImagesSquare, Play, Trash, UploadSimple } from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/ConfirmDialog";
import type { ProductMedia } from "@/lib/types";
import { MAX_MEDIA, MEDIA_MSG, UPLOAD_BUDGET, compressImage, compressVideo, formatMB, mediaKind, totalBytes, type PickedMedia } from "./media";

/**
 * Photos and videos of a piece: the ones already saved (edit) and the new ones picked here.
 * New photos and videos are compressed as they are added; the meter shows how much of the one-request
 * budget they use. The first item is the cover customers see.
 */
export function MediaPicker({
  existing,
  onRemoveExisting,
  picked,
  onPickedChange,
  error,
}: {
  existing: ProductMedia[];
  onRemoveExisting: (id: string) => void;
  picked: PickedMedia[];
  onPickedChange: (next: PickedMedia[]) => void;
  error: string | null;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const count = existing.length + picked.length;
  const used = totalBytes(picked);

  // Object URLs belong to this component: release them when items leave or it unmounts.
  const live = useRef(picked);
  useEffect(() => {
    const removed = live.current.filter((old) => !picked.some((p) => p.key === old.key));
    removed.forEach((r) => URL.revokeObjectURL(r.preview));
    live.current = picked;
  }, [picked]);
  useEffect(() => () => live.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const add = async (files: FileList | File[]) => {
    setProblem(null);
    const list = Array.from(files);
    if (!list.length) return;
    if (list.some((f) => !mediaKind(f))) return setProblem(MEDIA_MSG.type);
    if (count + list.length > MAX_MEDIA) return setProblem(MEDIA_MSG.tooMany);
    setBusy(true);
    try {
      const prepared: PickedMedia[] = [];
      for (const file of list) {
        const kind = mediaKind(file)!;
        let ready: File | null;
        if (kind === "IMAGE") ready = await compressImage(file).catch(() => null);
        else {
          // A video gets whatever the request has left once the photos picked so far are counted.
          const left = UPLOAD_BUDGET - used - totalBytes(prepared);
          setProgress(0);
          try {
            ready = await compressVideo(file, left, setProgress);
          } catch (error) {
            prepared.forEach((p) => URL.revokeObjectURL(p.preview));
            return setProblem(error instanceof Error && error.message === MEDIA_MSG.videoLong ? MEDIA_MSG.videoLong : MEDIA_MSG.videoBroken);
          } finally {
            setProgress(null);
          }
        }
        if (!ready) {
          prepared.forEach((p) => URL.revokeObjectURL(p.preview));
          return setProblem(MEDIA_MSG.broken);
        }
        prepared.push({ key: `${Date.now()}-${prepared.length}-${file.name}`, file: ready, kind, preview: URL.createObjectURL(ready) });
      }
      if (used + totalBytes(prepared) > UPLOAD_BUDGET) {
        prepared.forEach((p) => URL.revokeObjectURL(p.preview));
        return setProblem(MEDIA_MSG.budget);
      }
      onPickedChange([...picked, ...prepared]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const shown = problem ?? error;
  const ratio = Math.min(1, used / UPLOAD_BUDGET);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-meta font-bold text-ink-2">صور وفيديو القطعة</p>
          <p className="text-meta text-ink-3">أول صورة هي الغلاف اللي بيشوفه العميل. لحد ١٠ صور وفيديوهات.</p>
        </div>
        <span className="shrink-0 text-meta font-bold whitespace-nowrap tabular-nums text-ink-2">
          {count.toLocaleString("ar-EG")} من {MAX_MEDIA.toLocaleString("ar-EG")}
        </span>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <AnimatePresence initial={false}>
          {existing.map((item, i) => (
            <Tile key={item.id} cover={i === 0} kind={item.type === "VIDEO" ? "VIDEO" : "IMAGE"} src={item.url} label={`الملف ${i + 1}`} onRemove={() => onRemoveExisting(item.id)} />
          ))}
          {picked.map((item, i) => (
            <Tile key={item.key} cover={existing.length === 0 && i === 0} kind={item.kind} src={item.preview} local label={`${item.file.name}، ${formatMB(item.file.size)}`} onRemove={() => onPickedChange(picked.filter((p) => p.key !== item.key))} />
          ))}
        </AnimatePresence>
        {count < MAX_MEDIA && (
          <li>
            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void add(e.dataTransfer.files);
              }}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-image border-[1.5px] border-dashed text-center text-meta font-bold transition-colors duration-quick ${
                dragging ? "border-primary bg-primary-container text-on-primary-container" : shown ? "border-error text-error" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"
              }`}
            >
              {busy ? <Spinner className="size-6" /> : count ? <UploadSimple className="size-6" aria-hidden="true" /> : <ImagesSquare className="size-7" aria-hidden="true" />}
              {progress !== null ? `بنضغط الفيديو ${Math.round(progress * 100).toLocaleString("ar-EG")}٪` : busy ? "بنجهّز الصور" : "ضيف صور"}
            </label>
            <input
              ref={input}
              id={inputId}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="sr-only"
              disabled={busy}
              onChange={(e) => e.target.files && void add(e.target.files)}
              aria-describedby={shown ? `${inputId}-error` : undefined}
            />
          </li>
        )}
      </ul>

      {picked.length > 0 && (
        <div className="flex items-center gap-3" aria-label="حجم الملفات الجديدة">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div className={`h-full rounded-full transition-[width] duration-standard ease-soft ${ratio > 0.85 ? "bg-warning" : "bg-primary"}`} style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="text-meta tabular-nums text-ink-3">
            {formatMB(used)} من {formatMB(UPLOAD_BUDGET)}
          </span>
        </div>
      )}

      {shown && (
        <p id={`${inputId}-error`} role="alert" className="text-meta font-semibold text-error">
          {shown}
        </p>
      )}
    </div>
  );
}

function Tile({ cover, kind, src, local = false, label, onRemove }: { cover: boolean; kind: "IMAGE" | "VIDEO"; src: string | null; local?: boolean; label: string; onRemove: () => void }) {
  return (
    <m.li layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }} className="group relative aspect-square overflow-hidden rounded-image bg-surface-sunken">
      {kind === "VIDEO" ? (
        <>
          {src && <video src={src} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden="true" />}
          <span className="absolute inset-0 grid place-items-center bg-secondary/40 text-on-secondary">
            <Play className="size-7" weight="fill" aria-hidden="true" />
          </span>
        </>
      ) : src ? (
        // Local previews are blob: URLs, which the image optimiser can't fetch.
        local ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <Image src={src} alt="" fill sizes="160px" className="object-cover" />
        )
      ) : null}
      {cover && <span className="absolute start-1.5 top-1.5 rounded-tag bg-paper/90 px-1.5 py-0.5 text-[0.6875rem] font-extrabold text-ink">الغلاف</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`شيل ${label}`}
        className="absolute end-1.5 bottom-1.5 grid size-9 place-items-center rounded-full bg-paper/90 text-error opacity-100 shadow-sm transition-opacity duration-quick hover:bg-paper sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <Trash className="size-4" aria-hidden="true" />
      </button>
    </m.li>
  );
}
