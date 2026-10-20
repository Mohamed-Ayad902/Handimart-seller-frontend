import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Buttons and button-styled links. `primary` (orange, plum-ink label: white on orange fails
 * contrast) is for the single most important action on a page; `secondary` is plum; `quiet` is
 * an outlined control on paper; `danger` is the outlined brick-red way out (decline, cancel),
 * never orange (app: SellerDialogs). Every variant keeps a 48px touch target.
 */
type Variant = "primary" | "secondary" | "quiet" | "danger";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-6 text-subtitle font-bold whitespace-nowrap " +
  "transition-[background-color,color,transform,filter] duration-quick ease-soft active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Hover lightens the orange: the plum label then gains contrast instead of losing it.
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary: "bg-secondary text-on-secondary hover:opacity-90",
  quiet: "border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-surface",
  danger: "border-[1.5px] border-error bg-transparent text-error hover:bg-error-container",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
