import { Illustration } from "@/components/brand/Illustration";

/** A section that couldn't load, inside an otherwise working page (app: "القسم ده ماحملش"). */
export function SectionError({ message = "القسم ده ماحملش. جرّب تحدّث الصفحة بعد شوية." }: { message?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-image bg-surface-sunken/60 p-5" role="status">
      <Illustration name="tangledThread" className="w-20 shrink-0" />
      <p className="text-body-sm text-ink-2">{message}</p>
    </div>
  );
}
