"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Spinner } from "@/components/ui/ConfirmDialog";
import { TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/client/api";
import { text } from "@/lib/validation";
import type { SellerOrder } from "@/lib/types";
import { useUpdateOrderStatus } from "./api";
import { movesFor, type Move } from "./status";

const reasonCheck = text({ min: 5, max: 500 });

/**
 * The order's next move: the forward step is the wide primary button, the way out is the
 * outlined brick-red one. Every move is confirmed first because the customer is notified.
 */
export function OrderActions({ order, className = "" }: { order: SellerOrder; className?: string }) {
  const { forward, back } = movesFor(order);
  const [move, setMove] = useState<Move | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const update = useUpdateOrderStatus();
  const toast = useToast();

  if (!forward && !back) return null;

  const open = (m: Move) => {
    setMove(m);
    setReason("");
    setTouched(false);
    setProblem(null);
  };

  const reasonError = move?.needsReason && touched ? reasonCheck(reason) : null;

  const confirm = () => {
    if (!move || update.isPending) return;
    if (move.needsReason) {
      setTouched(true);
      if (reasonCheck(reason)) return;
    }
    setProblem(null);
    update.mutate(
      { id: order.id, change: { status: move.target, comment: move.needsReason ? reason.trim() : undefined } },
      {
        onSuccess: () => {
          setMove(null);
          toast.show(move.kind === "decline" || move.kind === "cancel" ? "اتلغى الطلب وبلّغنا العميل" : "اتحدثت حالة الطلب، والعميل وصله إشعار");
        },
        onError: (error) => setProblem(error instanceof ApiError ? error.fields.comment ?? error.message : "حصلت مشكلة. جرّب تاني."),
      },
    );
  };

  return (
    <div className={`flex gap-3 ${className}`}>
      {back && (
        <Button variant="danger" className="flex-1" onClick={() => open(back)} disabled={update.isPending}>
          {back.label}
        </Button>
      )}
      {forward && (
        <Button className="flex-[1.5]" onClick={() => open(forward)} disabled={update.isPending}>
          {update.isPending && <Spinner />}
          {forward.label}
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(move)}
        onClose={() => setMove(null)}
        onConfirm={confirm}
        busy={update.isPending}
        title={move?.confirm.title ?? ""}
        body={move?.confirm.body}
        confirmLabel={move?.confirm.cta ?? ""}
        destructive={move?.target === "CANCELLED"}
      >
        {move?.needsReason && (
          <TextArea
            id="decline-reason"
            label="السبب"
            placeholder="مثال: المواد الخام غير متوفرة حالياً"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            error={reasonError}
          />
        )}
        {problem && (
          <p role="alert" className="rounded-control bg-error-container p-3 text-body-sm font-semibold text-error">
            {problem}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
