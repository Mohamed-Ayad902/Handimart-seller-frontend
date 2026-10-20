/** The running-stitch divider (app: StitchLine). Decorative, so hidden from assistive tech. */
export function Stitch({ className = "", tone = "default" }: { className?: string; tone?: "default" | "accent" | "primary" }) {
  const color = tone === "primary" ? "var(--hm-primary)" : tone === "accent" ? "var(--hm-accent)" : undefined;
  return (
    <div
      aria-hidden="true"
      className={`stitch w-full ${className}`}
      style={color ? ({ "--stitch-color": color } as React.CSSProperties) : undefined}
    />
  );
}
