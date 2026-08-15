import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { TaskPriority } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import type { PromptDraft } from "@renderer/features/prompts";
import { CaptionText, OverlineText } from "@renderer/shared/typography";
import { DateField, toIsoDate } from "@renderer/shared/ui/date";

const PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

const priorityLabel: Record<TaskPriority, string> = {
  low: translation.Tasks.PriorityLow,
  normal: translation.Tasks.PriorityNormal,
  high: translation.Tasks.PriorityHigh
};

interface TaskMetaFieldsProps {
  draft: PromptDraft;
  onPatch: (values: Partial<PromptDraft>) => void;
}

/**
 * What to do first, and by when.
 *
 * Both belong to the task rather than to the prompt, but both end up in the
 * prompt — priority as the instruction to start with this, the deadline as the
 * date — so they are edited beside the fields that produce it and the preview
 * answers on the keystroke like everything else.
 */
export function TaskMetaFields({ draft, onPatch }: Readonly<TaskMetaFieldsProps>) {
  const { t } = useTranslation();

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <OverlineText tone="muted">{t(translation.Tasks.Priority)}</OverlineText>

        <div className="flex gap-1">
          {PRIORITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPatch({ priority: option })}
              className={clsx(
                "flex-1 rounded-lg border py-1.5",
                draft.priority === option
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/40"
              )}
            >
              <CaptionText className={draft.priority === option ? "!text-accent" : "!text-muted"}>
                {t(priorityLabel[option])}
              </CaptionText>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <OverlineText tone="muted">{t(translation.Tasks.Deadline)}</OverlineText>

        <DateField
          value={draft.deadline}
          onChange={(deadline) => onPatch({ deadline })}
          title={t(translation.Tasks.Deadline)}
          minDate={toIsoDate(new Date())}
        />
      </div>
    </div>
  );
}
