"use client";

import type { ReactNode } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

/**
 * Asks before anything that notifies a customer or can't be taken back. The confirming button
 * shows progress and can't be pressed twice; a destructive confirm is brick red, never orange.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel = "رجوع",
  destructive = false,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} locked={busy}>
      {body && <p className="text-body text-ink-2">{body}</p>}
      {children}
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy ? <Spinner /> : null}
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

/** A thread winding round a spool: the in-button progress mark. */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} motion-safe:animate-spin`}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
