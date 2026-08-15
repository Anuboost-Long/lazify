import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { TaskPriority, TaskStatus } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

/**
 * What a task row is made of, in one place.
 *
 * A task shows up on the home page and again in the rail beside the agents; the
 * two are different widths, not different things, so what carries the meaning —
 * the priority rule, the status control, the chips — is shared and only the
 * spacing differs.
 */

/** Priority is the rule down the leading edge: seen before anything is read. */
export const priorityRule: Record<TaskPriority, string> = {
  high: "bg-error",
  normal: "bg-accent",
  low: "bg-border"
};

interface StatusToggleProps {
  status: TaskStatus;
  onCycle: () => void;
  /** The rail runs tighter than the page. */
  compact?: boolean;
}

/** Empty, half, full — the three states a task moves through, in one control. */
export function StatusToggle({ status, onCycle, compact = false }: Readonly<StatusToggleProps>) {
  const { t } = useTranslation();
  const done = status === "done";

  return (
    <Tooltip content={t(translation.Tasks.CycleStatus)} side="right">
      <button
        type="button"
        onClick={onCycle}
        aria-label={t(translation.Tasks.CycleStatus)}
        className={clsx(
          "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          compact ? "h-4 w-4" : "h-5 w-5",
          done && "border-accent bg-accent text-bg",
          status === "doing" && "border-accent",
          status === "todo" && "border-muted/50 hover:border-accent"
        )}
      >
        {done ? <UiIcon name="check-circle" className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} /> : null}
        {status === "doing" ? (
          <span
            aria-hidden
            className={clsx("rounded-full bg-accent", compact ? "h-1.5 w-1.5" : "h-2 w-2")}
          />
        ) : null}
      </button>
    </Tooltip>
  );
}

type ChipTone = "muted" | "accent" | "error";

const chipTone: Record<ChipTone, string> = {
  muted: "border-border bg-text/[0.04] !text-muted",
  accent: "border-accent/30 bg-accent/10 !text-accent",
  error: "border-error/30 bg-error/10 !text-error"
};

interface TaskChipProps {
  icon?: UiIconName;
  tone?: ChipTone;
  children: ReactNode;
}

/** One fact about a task, small enough to sit beside three others. */
export function TaskChip({ icon, tone = "muted", children }: Readonly<TaskChipProps>) {
  return (
    <CaptionText
      className={clsx(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5",
        chipTone[tone]
      )}
    >
      {icon ? <UiIcon name={icon} className="h-2.5 w-2.5 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </CaptionText>
  );
}
