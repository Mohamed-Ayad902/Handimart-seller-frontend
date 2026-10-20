"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { TextField } from "./Field";

/** Password input with a show/hide toggle (the toggle never submits the form). The input is LTR, so the toggle sits on its physical left whatever the page direction. */
export function PasswordField({ className = "", ...props }: ComponentProps<"input"> & { label: string; error?: string | null; hint?: ReactNode; id: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} type={shown ? "text" : "password"} dir="ltr" className={`!pl-12 text-start ${className}`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "اخفي كلمة السر" : "اظهر كلمة السر"}
        aria-pressed={shown}
        className="absolute left-1 top-[1.85rem] grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken"
      >
        {shown ? <EyeSlash className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
