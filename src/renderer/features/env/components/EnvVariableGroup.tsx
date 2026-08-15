import clsx from "clsx";
import type { ReactNode } from "react";

import { CaptionText } from "@renderer/shared/typography";

interface EnvVariableGroupProps {
  label: string;
  count: number;
  /** Dims the heading for the group that is switched off. */
  muted?: boolean;
  children: ReactNode;
}

/**
 * A titled band of variable cards.
 *
 * Active and commented-out variables answer different questions — "what is this
 * project running with" versus "what could I turn back on" — so they are read
 * as two lists rather than one list with some rows greyed out. The heading
 * carries the count, which is the number people actually came to check.
 */
export function EnvVariableGroup({ label, count, muted = false, children }: Readonly<EnvVariableGroupProps>) {
  return (
    <section className="mb-5 last:mb-1">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-bg/95 px-1 py-1 backdrop-blur">
        <CaptionText
          tone="muted"
          className={clsx("uppercase tracking-wide", muted ? "opacity-70" : "!text-text")}
        >
          {label}
        </CaptionText>

        <span
          className={clsx(
            "rounded-full px-1.5 text-[10px] font-semibold leading-4",
            muted ? "bg-text/[0.06] text-muted" : "bg-accent/10 text-accent"
          )}
        >
          {count}
        </span>

        <span aria-hidden className="h-px flex-1 bg-border" />
      </header>

      {/* Rows carry their own padding, so the space between them comes from
          that rather than from a gap — one rhythm instead of two. */}
      <div className="pt-0.5">{children}</div>
    </section>
  );
}
