/** Loading placeholder shaped like the content it stands in for (no spinners). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-image bg-surface-sunken bg-[linear-gradient(90deg,transparent_0%,var(--hm-surface)_50%,transparent_100%)] bg-size-[200%_100%] motion-safe:animate-[hm-shimmer_1.6s_linear_infinite] ${className}`}
    />
  );
}
