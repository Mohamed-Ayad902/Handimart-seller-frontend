"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

type Tone = "ok" | "error";
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
  action?: { label: string; href: string };
}

const ToastContext = createContext<{ show: (text: string, options?: { tone?: Tone; action?: ToastItem["action"] }) => void } | null>(null);

/** Short confirmations ("added to cart") that never block the page. Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const show = useCallback((text: string, options: { tone?: Tone; action?: ToastItem["action"] } = {}) => {
    const id = next.current++;
    setItems((list) => [...list.slice(-2), { id, tone: options.tone ?? "ok", text, action: options.action }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), options.action ? 6500 : 4200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 max-lg:bottom-20" aria-live="polite" role="status">
        {items.map((t) => (
          <div
            key={t.id}
            className="enter pointer-events-auto flex max-w-md items-center gap-3 rounded-control bg-inverse px-4 py-3 text-body-sm font-bold text-on-inverse shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5)]"
          >
            {t.tone === "ok" ? (
              <CheckCircle weight="fill" className="size-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <WarningCircle weight="fill" className="size-5 shrink-0 text-error" aria-hidden="true" />
            )}
            <span>{t.text}</span>
            {t.action && (
              <Link href={t.action.href} className="ms-2 shrink-0 underline decoration-2 underline-offset-4">
                {t.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast needs a ToastProvider");
  return ctx;
}
