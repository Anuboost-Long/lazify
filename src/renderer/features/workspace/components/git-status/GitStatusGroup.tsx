import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { BodyText, MonoText } from "@renderer/shared/typography";

/**
 * A collapsible section of the source control view — "Staged Changes",
 * "Changes" — with the file count on the right, the way VS Code groups them.
 *
 * The header is a flat row rather than a card: a chevron, a label, a count.
 * Nothing else, so the files below it stay the loudest thing in the panel.
 */

interface GitStatusGroupProps {
  label: string;
  count: number;
  /** Right-aligned controls, revealed on hover like VS Code's group actions. */
  actions?: ReactNode;
  children: ReactNode;
}

export function GitStatusGroup({
  label,
  count,
  actions,
  children
}: Readonly<GitStatusGroupProps>) {
  const [collapsed, setCollapsed] = useState(false);

  if (count === 0) return null;

  return (
    <section className="group/section">
      <div className="flex items-center gap-1 pl-1 pr-2">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          className={clsx(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 pl-1 pr-2 text-left",
            "transition-colors hover:bg-accent/[0.06]"
          )}
        >
          <span className="w-3 shrink-0 text-center text-[11px] text-muted">
            {collapsed ? "▸" : "▾"}
          </span>
          <BodyText as="span" className="min-w-0 flex-1 truncate text-text">
            {label}
          </BodyText>
        </button>

        {actions ? (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/section:opacity-100 [@media(hover:none)]:opacity-100">
            {actions}
          </div>
        ) : null}

        <MonoText
          as="span"
          className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] tabular-nums text-accent"
        >
          {count}
        </MonoText>
      </div>

      {collapsed ? null : children}
    </section>
  );
}
