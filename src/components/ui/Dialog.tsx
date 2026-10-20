"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

/**
 * Modal dialog on the native <dialog> element: focus is trapped, Escape closes it and focus goes
 * back to what opened it. It is a bottom sheet on phones and a centred panel on larger screens.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "md",
  locked = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "lg";
  /** While a request is in flight the dialog can't be dismissed (Escape, backdrop, close button). */
  locked?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-lenis-prevent=""
      onClose={onClose}
      onCancel={(e) => {
        if (locked) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !locked) ref.current?.close();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] ${size === "lg" ? "w-[min(42rem,calc(100vw-1.5rem))]" : "w-[min(30rem,calc(100vw-1.5rem))]"} overflow-y-auto overscroll-contain rounded-sheet bg-surface p-0 text-ink shadow-[0_24px_80px_-24px_rgb(42_19_48/0.45)] backdrop:bg-scrim backdrop:backdrop-blur-[2px] max-sm:mb-0 max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none`}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-title font-extrabold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={locked}
            className="-me-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken"
            aria-label="إغلاق"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}
