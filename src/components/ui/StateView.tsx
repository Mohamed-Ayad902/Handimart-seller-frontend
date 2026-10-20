import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/brand/Illustration";

/** Designed empty / error / not-found states (app: HandiStateView). */
export function StateView({
  illustration,
  title,
  body,
  action,
  headingLevel = 2,
  className = "",
}: {
  illustration: IllustrationName;
  title: string;
  body?: string;
  action?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className={`mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center ${className}`} role="status">
      <Illustration name={illustration} className="mb-2 w-40 sm:w-48" />
      <Heading className="text-title font-extrabold text-ink">{title}</Heading>
      {body && <p className="text-body text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
