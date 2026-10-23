"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StateView } from "@/components/ui/StateView";
import { crash } from "@/lib/observability/crash";

/** A page that broke while rendering: reported as a crash, with a way back. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error.digest) crash.setKey("digest", error.digest);
    crash.recordNonFatal(error, true);
  }, [error]);

  return (
    <main id="main" className="page-gutter">
      <StateView
        illustration="tangledThread"
        headingLevel={1}
        title="حصلت مشكلة في الصفحة دي"
        body="بلّغنا الفريق بيها. جرّب تاني، ولو فضلت كلم الدعم."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>حاول تاني</Button>
            <ButtonLink href="/" variant="quiet">
              الرئيسية
            </ButtonLink>
          </div>
        }
      />
    </main>
  );
}
