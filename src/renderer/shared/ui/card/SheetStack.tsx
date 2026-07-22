import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Layered document sheets with a folded corner and an icon chip.
 *
 * The card artwork from the playful-doc-console direction. Place inside a
 * `group` element — the sheets fan out and the chip lifts on hover.
 */

interface SheetStackProps {
  /** Rendered in the chip that overlaps the sheets. */
  icon: ReactNode;
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: { root: "h-12 w-12", sheet: "h-10 w-8", chip: "h-6 w-6 rounded-[8px]" },
  md: { root: "h-16 w-16", sheet: "h-14 w-11", chip: "h-8 w-8 rounded-[10px]" },
} as const;

export function SheetStack({
  icon,
  active = false,
  size = "sm",
  className,
}: Readonly<SheetStackProps>) {
  const scale = SIZES[size];

  return (
    <div className={clsx("relative shrink-0", scale.root, className)}>
      {/* Back sheet — drifts further out on hover. */}
      <div
        className={clsx(
          "absolute left-1.5 top-0 rotate-[8deg] rounded-[8px] border",
          "transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[14deg]",
          scale.sheet,
          active ? "border-accent/40 bg-accent/10" : "border-border bg-bg"
        )}
      />

      {/* Front sheet with a folded corner. */}
      <div
        className={clsx(
          "absolute left-0 top-1 -rotate-[6deg] overflow-hidden rounded-[8px] border",
          "transition-transform duration-300 group-hover:-rotate-[10deg]",
          scale.sheet,
          active ? "border-accent/60 bg-accent/[0.14]" : "border-border bg-soft"
        )}
      >
        <div
          className={clsx("absolute right-0 top-0 h-2.5 w-2.5", active ? "bg-accent/40" : "bg-border")}
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />
      </div>

      {/* Icon chip. */}
      <div
        className={clsx(
          "absolute -bottom-0.5 right-0 flex items-center justify-center border",
          "transition-transform duration-300 group-hover:scale-110",
          scale.chip,
          active ? "border-accent/50 bg-bg text-accent" : "border-border bg-bg text-muted"
        )}
      >
        {icon}
      </div>
    </div>
  );
}
