import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { pasteIntoTerminal } from "@renderer/shared/lib/terminal-paste";
import { CaptionText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { PromptComposer } from "./PromptComposer";
import { PromptPreviewPane } from "./PromptPreviewPane";
import { usePromptDraft } from "../hooks/use-prompt-draft";
import { usePromptPresets } from "../hooks/use-prompt-presets";

interface PromptBuilderCardProps {
  projectPath: string;
  projectName: string;
  /** The agent the prompt would go to, or null when none is running. */
  activeRunId: string | null;
  activeAgentLabel: string;
  /** Opened from a task: its fields fill the composer and runs are kept. */
  task?: Task | null;
  onClose: () => void;
}

/**
 * Writes the task on the left, reads the prompt on the right.
 *
 * The generated text never leaves this machine to be made: it is assembled from
 * the preset, the project's context and what was typed, so the same task always
 * produces the same instructions.
 */
export function PromptBuilderCard({
  projectPath,
  projectName,
  activeRunId,
  activeAgentLabel,
  task = null,
  onClose
}: Readonly<PromptBuilderCardProps>) {
  const { t } = useTranslation();
  const { presets } = usePromptPresets();
  const { draft, patch, reset, prompt, built, isEdited, setEdited, regenerate, suggestedPresetId } =
    usePromptDraft(projectPath, projectName, presets);
  const [copied, setCopied] = useState(false);

  // Filled once, on mount: what the user types afterwards is theirs, not the
  // task's, until they save it back.
  useEffect(() => {
    if (!task) {
      reset();
      return;
    }

    patch({
      taskName: task.name,
      description: task.description,
      requirements: task.requirements,
      notes: task.notes,
      presetId: task.presetId,
      priority: task.priority,
      deadline: task.deadline
    });
  }, [task, patch, reset]);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pasted rather than typed: a prompt is many lines, and a terminal submits on
  // every newline it is sent.
  const sendToAgent = () => {
    if (!activeRunId || !prompt.trim()) return;

    pasteIntoTerminal(activeRunId, prompt.trim());

    // Kept as sent, so the task's history shows the instructions that were
    // actually given rather than what the fields would build today.
    if (task) {
      void globalThis.lazify.recordTaskRun({
        taskId: task.id,
        agentRunId: activeRunId,
        agentLabel: activeAgentLabel,
        presetId: built?.presetId ?? null,
        generatedPrompt: prompt.trim()
      });
    }

    onClose();
  };

  return (
    <div
      className={clsx(
        "flex h-[min(760px,88vh)] w-[min(1100px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <UiIcon name="sparks" className="h-4 w-4 text-accent" />
          <SectionTitle>{t(translation.PromptBuilder.Title)}</SectionTitle>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t(translation.GlobalTerm.Close)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
        >
          <UiIcon name="xmark" className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-5 px-5 py-4">
        <div className="flex min-h-0 w-[42%] flex-col">
          <PromptComposer
            draft={draft}
            presets={presets}
            suggestedPresetId={suggestedPresetId}
            onPatch={patch}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <PromptPreviewPane
            prompt={prompt}
            isEdited={isEdited}
            contextCount={built?.usedEntryIds.length ?? 0}
            onEdit={setEdited}
            onRegenerate={() => void regenerate()}
          />
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <CaptionText tone="muted">
          {activeRunId
            ? t(translation.PromptBuilder.SendHint)
            : t(translation.PromptBuilder.NoAgentRunning)}
        </CaptionText>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!prompt.trim()}
            className={clsx(
              "flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2",
              "text-[12px] text-text hover:border-accent/40",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <UiIcon name={copied ? "check-circle" : "code"} className="h-3.5 w-3.5" />
            {t(copied ? translation.GlobalTerm.Done : translation.PromptBuilder.Copy)}
          </button>

          <button
            type="button"
            onClick={sendToAgent}
            disabled={!activeRunId || !prompt.trim()}
            className={clsx(
              "flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2",
              "text-[12px] text-accent hover:bg-accent/15",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <UiIcon name="play" className="h-3.5 w-3.5" />
            {t(translation.PromptBuilder.SendToAgent)}
          </button>
        </div>
      </footer>
    </div>
  );
}
