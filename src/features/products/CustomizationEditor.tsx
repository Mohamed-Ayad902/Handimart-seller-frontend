"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import type { Customization } from "@/lib/types";
import { MSG, numberCheck, parseNumber, text } from "@/lib/validation";

interface DraftValue {
  value: string;
  price: string;
}

interface Draft {
  label: string;
  required: boolean;
  values: DraftValue[];
}

const labelCheck = text({ min: 1, max: 60 });
const valueCheck = text({ min: 1, max: 60 });
const priceCheck = numberCheck({ min: 0, optional: true });

/** "Options the customer picks" (colour, size, a name to engrave), each with its choices. */
export function CustomizationEditor({ value, onChange }: { value: Customization[]; onChange: (next: Customization[]) => void }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const save = (c: Customization) => {
    if (editing === "new") onChange([...value, c]);
    else if (editing !== null) onChange(value.map((old, i) => (i === editing ? { ...c, id: old.id } : old)));
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-meta font-bold text-ink-2">خيارات العميل (اختياري)</p>
        <p className="text-meta text-ink-3">زي اللون أو المقاس أو اسم يتحفر، والعميل بيختار وهو بيطلب.</p>
      </div>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {value.map((c, i) => (
            <m.li key={c.id ?? `${c.label}-${i}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-image border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-body font-bold">
                  {c.label}
                  {c.required && <span className="text-meta font-semibold text-accent-text">إجباري</span>}
                </p>
                <p className="truncate text-meta text-ink-3">{c.values.map((v) => v.value).join("، ")}</p>
              </div>
              <button type="button" onClick={() => setEditing(i)} aria-label={`عدّل ${c.label}`} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken hover:text-ink">
                <PencilSimple className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`شيل ${c.label}`} className="grid size-10 place-items-center rounded-full text-error hover:bg-error-container">
                <Trash className="size-5" aria-hidden="true" />
              </button>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>

      <Button type="button" variant="quiet" className="w-fit" onClick={() => setEditing("new")}>
        <Plus className="size-5" aria-hidden="true" />
        ضيف خيار
      </Button>

      {editing !== null && <OptionDialog initial={editing === "new" ? null : (value[editing] ?? null)} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function OptionDialog({ initial, onSave, onClose }: { initial: Customization | null; onSave: (c: Customization) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? { label: initial.label, required: initial.required, values: initial.values.map((v) => ({ value: v.value, price: v.additionalPrice ? String(v.additionalPrice) : "" })) }
      : { label: "", required: false, values: [{ value: "", price: "" }] },
  );
  const [submitted, setSubmitted] = useState(false);

  const labelError = labelCheck(draft.label);
  const valueErrors = draft.values.map((v) => ({ value: valueCheck(v.value), price: priceCheck(v.price) }));
  const valid = !labelError && draft.values.length > 0 && valueErrors.every((e) => !e.value && !e.price);

  const setValue = (i: number, patch: Partial<DraftValue>) => setDraft((d) => ({ ...d, values: d.values.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave({
      label: draft.label.trim(),
      required: draft.required,
      values: draft.values.map((v) => ({ value: v.value.trim(), additionalPrice: parseNumber(v.price) ?? 0, additionalTimeMinutes: 0 })),
    });
  };

  return (
    <Dialog open onClose={onClose} title={initial ? "عدّل الخيار" : "خيار جديد"} size="lg">
      <div className="flex flex-col gap-5">
        <TextField id="opt-label" label="اسم الخيار" placeholder="مثلاً: اللون" value={draft.label} maxLength={60} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} error={submitted ? labelError : null} />

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
          <input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} className="size-5 accent-[var(--hm-primary)]" />
          العميل لازم يختار منه
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-meta font-bold text-ink-2">الاختيارات</legend>
          {draft.values.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-start gap-2">
              <TextField id={`opt-v-${i}`} label={`الاختيار ${(i + 1).toLocaleString("ar-EG")}`} value={v.value} maxLength={60} onChange={(e) => setValue(i, { value: e.target.value })} error={submitted ? valueErrors[i]?.value : null} />
              <TextField id={`opt-p-${i}`} label="زيادة السعر (ج.م)" inputMode="decimal" dir="ltr" placeholder="0" value={v.price} onChange={(e) => setValue(i, { price: e.target.value })} error={submitted ? valueErrors[i]?.price : null} />
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, values: d.values.filter((_, j) => j !== i) }))}
                disabled={draft.values.length === 1}
                aria-label={`شيل الاختيار ${i + 1}`}
                className="mt-6 grid size-12 place-items-center rounded-full text-ink-2 hover:bg-surface-sunken disabled:opacity-30"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {draft.values.length < 20 && (
            <Button type="button" variant="quiet" className="w-fit" onClick={() => setDraft((d) => ({ ...d, values: [...d.values, { value: "", price: "" }] }))}>
              <Plus className="size-5" aria-hidden="true" />
              اختيار تاني
            </Button>
          )}
          {submitted && draft.values.length === 0 && <p className="text-meta font-semibold text-error">{MSG.required}</p>}
        </fieldset>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="quiet" onClick={onClose}>
            رجوع
          </Button>
          <Button type="button" variant="secondary" onClick={submit}>
            احفظ الخيار
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
