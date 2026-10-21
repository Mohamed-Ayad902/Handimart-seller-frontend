"use client";

import { useEffect } from "react";
import { crash } from "@/lib/observability/crash";

/** The root layout itself failed: nothing of the site is left, so this page brings its own frame. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error.digest) crash.setKey("digest", error.digest);
    crash.recordNonFatal(error, true);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 24, textAlign: "center" }}>
        <main>
          <h1 style={{ fontSize: 22 }}>حصلت مشكلة</h1>
          <p>بلّغنا الفريق بيها. جرّب تاني بعد لحظة.</p>
          <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#e06e2d", color: "#2a1330", fontWeight: 700 }}>
            حاول تاني
          </button>
        </main>
      </body>
    </html>
  );
}
