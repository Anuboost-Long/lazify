import clsx from "clsx";

/**
 * Abstract art behind the routed page content.
 *
 * Same vocabulary as CardShapes — rotated rounded squares, circles, slim
 * capsules, grid marks — but drawn much larger and at a fraction of the
 * opacity, so it reads as texture in the paper rather than as decoration.
 *
 * Two rules keep it out of the way: it is pinned to the pane instead of the
 * scrolled content, so it never drifts under a paragraph mid-scroll; and every
 * shape hugs a corner, leaving the middle column where content actually sits
 * clear.
 */

function GridMarks({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={clsx("grid grid-cols-4 gap-2.5", className)}>
      {Array.from({ length: 16 }).map((_, index) => (
        <span key={index} className="h-1 w-1 rounded-full bg-current" />
      ))}
    </div>
  );
}

export function ContentBackdrop({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-0 overflow-hidden text-muted",
        // Barely there on light, a touch stronger on dark where thin hairlines
        // disappear first.
        "opacity-[0.055] dark:opacity-[0.09]",
        className,
      )}
    >
      <div className="absolute -right-28 -top-32 h-[460px] w-[460px] rotate-12 rounded-[140px] border border-current" />
      <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full border border-current" />
      <div className="absolute -left-10 top-24 h-[120px] w-[120px] -rotate-6 rounded-[36px] border border-current" />
      <div className="absolute bottom-20 right-16 h-2.5 w-40 -rotate-12 rounded-full bg-current opacity-40" />
      <GridMarks className="absolute right-24 top-40" />
      <GridMarks className="absolute bottom-32 left-40 hidden xl:grid" />
    </div>
  );
}
