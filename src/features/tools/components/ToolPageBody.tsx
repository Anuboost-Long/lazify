import clsx from "clsx";
import type { ReactNode } from "react";

interface ToolPageBodyProps {
  /** `reading` keeps a document-like tool narrow; `wide` fills the window. */
  width?: "reading" | "wide";
  children: ReactNode;
}

/**
 * The scrolling body of a tool page.
 *
 * Tools fill the window, and a full-height container does not scroll on its
 * own — so a tool whose content is taller than the window needs a scroller of
 * its own or the bottom of it simply cannot be reached.
 */
export function ToolPageBody({ width = "reading", children }: Readonly<ToolPageBodyProps>) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={clsx(
          "mx-auto flex w-full flex-col gap-4 pb-8",
          width === "reading" ? "max-w-3xl" : "max-w-[1560px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
