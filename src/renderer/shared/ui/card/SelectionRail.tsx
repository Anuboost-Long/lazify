import clsx from "clsx";

/**
 * Marks a card as selected with a slim accent rail on its leading edge.
 *
 * Signals selection structurally instead of washing the whole component in an
 * accent-coloured halo, so elevation stays neutral and readable. Matches the
 * rail already used by the environment tool cards. The parent needs `relative`.
 */
export function SelectionRail({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-accent",
        className
      )}
    />
  );
}
