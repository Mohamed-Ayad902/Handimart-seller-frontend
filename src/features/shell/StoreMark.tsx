import Image from "next/image";
import type { Store } from "@/lib/types";

/** The store's logo, or its first letter on sand when it has none. */
export function StoreMark({ store, size = 40 }: { store: Store | null; size?: number }) {
  if (store?.logoUrl) {
    return <Image src={store.logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full bg-surface-sunken object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full bg-accent font-extrabold text-brand-plum" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {store?.name?.trim().charAt(0) || "؟"}
    </span>
  );
}
