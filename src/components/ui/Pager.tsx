import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "./Button";

/** Previous / next pages of a server-paged list (pages count from 0, shown from 1). */
export function Pager({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (p: number) => void; label: string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-center gap-3">
      <Button variant="quiet" onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label="الصفحة اللي قبلها">
        <CaretRight className="size-5" aria-hidden="true" />
      </Button>
      <span className="text-body-sm font-bold">
        صفحة {page + 1} من {totalPages}
      </span>
      <Button variant="quiet" onClick={() => onPage(page + 1)} disabled={page + 1 >= totalPages} aria-label="الصفحة اللي بعدها">
        <CaretLeft className="size-5" aria-hidden="true" />
      </Button>
    </nav>
  );
}
