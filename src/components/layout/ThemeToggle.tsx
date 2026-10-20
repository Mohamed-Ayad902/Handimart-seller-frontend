"use client";

import { useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

const KEY = "hm-theme";

/**
 * Runs before first paint so a returning dark-mode visitor never sees a light flash. Light is the
 * default for everyone else, including people whose phone is set to dark.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="dark"?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Sun and moon toggle in the header. The change eases over a third of a second, then the page is still. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (typeof document === "undefined" ? "light" : readTheme()));

  function toggle() {
    const next = readTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-easing");
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode can refuse storage; the choice then lasts for this page only.
    }
    window.setTimeout(() => root.classList.remove("theme-easing"), 400);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-sunken"
    >
      {dark ? <Sun className="size-6" aria-hidden="true" /> : <Moon className="size-6" aria-hidden="true" />}
    </button>
  );
}
