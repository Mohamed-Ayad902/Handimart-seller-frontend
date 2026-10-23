"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRinging, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { enablePush, pushState, subscribePush, type PushState } from "@/lib/observability/push";

const DISMISSED = "hm-push-prompt-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

/**
 * Asks once, on Home, to turn on browser notifications (the app's notification permission sheet).
 * Only while the browser hasn't been asked yet; "later" hides it, and the switch stays in Store settings.
 */
export function PushPrompt() {
  const state = useSyncExternalStore(subscribePush, pushState, () => "unsupported" as PushState);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [busy, setBusy] = useState(false);
  if (state !== "default" || dismissed) return null;

  const later = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* private mode: it asks again next visit */
    }
    setDismissed(true);
  };

  return (
    <aside aria-label="إشعارات المتصفح" className="enter flex flex-col gap-4 rounded-image-lg border border-line bg-surface p-5 sm:flex-row sm:items-center">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
        <BellRinging className="size-6" weight="duotone" />
      </span>
      <div className="flex-1">
        <p className="text-subtitle font-extrabold">متفوّتش أي طلب</p>
        <p className="text-body-sm text-ink-2">شغّل إشعارات المتصفح، ويوصلك كل طلب جديد أو رسالة حتى والموقع مقفول.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await enablePush().finally(() => setBusy(false));
          }}
        >
          شغّل الإشعارات
        </Button>
        <Button variant="quiet" className="min-h-11 px-3" onClick={later} aria-label="بعدين">
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
