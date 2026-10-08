import clsx from "clsx";

/** Which state the rail is reporting. `accent` is selection, the default. */
export type RailTone = "accent" | "success" | "error" | "warning";

const toneClassName: Record<RailTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning"
};

/**
 * Marks a card's state with a slim rail on its leading edge.
 *
 * Signals it structurally instead of washing the whole component in a coloured
 * halo, so elevation stays neutral and readable. Matches the rail already used
 * by the environment tool cards. The parent needs `relative`.
 *
 * `tone` rather than a colour in `className`: without tailwind-merge, a
 * `bg-success` passed in alongside a built-in `bg-accent` leaves the winner to
 * stylesheet order rather than to the caller.
 */
export function SelectionRail({
  tone = "accent",
  className
}: Readonly<{ tone?: RailTone; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-r-full",
        toneClassName[tone],
        className
      )}
    />
  );
}
