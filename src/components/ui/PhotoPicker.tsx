"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ImageSquare, X } from "@phosphor-icons/react";
import { UPLOAD_BUDGET, compressImage, formatMB } from "@/features/products/media";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A few optional photos attached to a reply (custom-request answers, support messages). Each is
 * shrunk in the browser like product photos, and the set has to fit one upload (handover R1).
 * The backend checks type and size again: this only spares the seller a failed send.
 */
export function PhotoPicker({ files, onChange, max, label, disabled = false }: { files: File[]; onChange: (files: File[]) => void; max: number; label: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = async (picked: FileList | null) => {
    if (!picked?.length) return;
    setError(null);
    const list = [...picked];
    if (list.some((f) => !TYPES.includes(f.type))) {
      setError("استخدم صور JPG أو PNG أو WebP بس.");
      return;
    }
    if (files.length + list.length > max) {
      setError(`لحد ${max} صور بس.`);
      return;
    }
    setBusy(true);
    try {
      const shrunk = await Promise.all(list.map(compressImage));
      const next = [...files, ...shrunk];
      if (next.reduce((s, f) => s + f.size, 0) > UPLOAD_BUDGET) setError(`الصور أكبر من اللي ينفع يترفع مرة واحدة (${formatMB(UPLOAD_BUDGET)}).`);
      else onChange(next);
    } catch {
      setError("معرفناش نقرا الصورة دي. جرّب صورة تانية.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta font-bold text-ink-2">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <li key={previews[i]} className="relative size-20 overflow-hidden rounded-[12px] bg-surface-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={previews[i]} alt={`صورة مرفقة ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute top-1 end-1 grid size-7 place-items-center rounded-full bg-inverse/80 text-on-inverse hover:bg-inverse"
              aria-label={`شيل الصورة ${i + 1}`}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
        {files.length < max && (
          <li>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => input.current?.click()}
              aria-describedby={hintId}
              className="grid size-20 place-items-center rounded-[12px] border-[1.5px] border-dashed border-line-strong text-ink-2 transition-colors duration-quick hover:border-ink hover:text-ink disabled:opacity-50"
            >
              <span className="flex flex-col items-center gap-1 text-[0.6875rem] font-bold">
                <ImageSquare className="size-6" aria-hidden="true" />
                {busy ? "بنجهزها..." : "أضف صورة"}
              </span>
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" accept={TYPES.join(",")} multiple hidden onChange={(e) => void add(e.target.files)} />
      <p id={hintId} className={`text-meta ${error ? "font-semibold text-error" : "text-ink-3"}`} role={error ? "alert" : undefined}>
        {error ?? `ممكن تضيف لحد ${max} صور توضّح ردك (اختياري)`}
      </p>
    </div>
  );
}
