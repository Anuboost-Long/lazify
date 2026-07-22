import clsx from "clsx";

/**
 * Clipped abstract shapes for card and panel backgrounds.
 *
 * Rotated rounded squares, circles, slim capsules and grid marks — used
 * sparingly, per the playful-doc-console direction (no gradients, no blobs).
 * The parent needs `relative overflow-hidden`, and content above it `relative`.
 */

interface CardShapesProps {
  /** Picks a shape arrangement so neighbouring cards do not look identical. */
  variant?: 0 | 1 | 2;
  className?: string;
}

function GridMarks({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={clsx("grid grid-cols-3 gap-1", className)}>
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="h-[3px] w-[3px] rounded-full bg-current opacity-40" />
      ))}
    </div>
  );
}

export function CardShapes({ variant = 0, className }: Readonly<CardShapesProps>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-0 overflow-hidden text-muted",
        "opacity-[0.35] transition-opacity duration-300 group-hover:opacity-60",
        className
      )}
    >
      {variant === 0 ? (
        <>
          <div className="absolute -right-6 -top-8 h-24 w-24 rotate-12 rounded-[22px] border border-current" />
          <div className="absolute right-8 bottom-4 h-2 w-12 -rotate-12 rounded-full bg-current opacity-30" />
          <GridMarks className="absolute right-4 top-16" />
        </>
      ) : null}

      {variant === 1 ? (
        <>
          <div className="absolute -bottom-6 -right-10 h-28 w-28 rounded-full border border-current" />
          <div className="absolute right-6 top-6 h-16 w-16 -rotate-6 rounded-[18px] border border-current" />
          <div className="absolute right-20 bottom-6 h-2 w-10 rotate-12 rounded-full bg-current opacity-30" />
        </>
      ) : null}

      {variant === 2 ? (
        <>
          <div className="absolute -right-8 top-4 h-20 w-20 rotate-[18deg] rounded-[20px] border border-current" />
          <div className="absolute right-10 bottom-2 h-10 w-10 rounded-full border border-current" />
          <GridMarks className="absolute right-24 top-8" />
        </>
      ) : null}
    </div>
  );
}
