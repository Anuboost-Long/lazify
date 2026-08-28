import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import type { Task, TaskInput, TaskStatus } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { pasteIntoTerminal } from "@renderer/shared/lib/terminal-paste";
import type { PtySession } from "@renderer/shared/types/lazify";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";

import { PromptComposer, PromptPreviewPane, usePromptDraft } from "../../prompts";
import { SendToAgentPicker } from "./SendToAgentPicker";
import { TaskMetaFields } from "./TaskMetaFields";
import { TaskRunHistory } from "./TaskRunHistory";

const STATUS_TABS: SegmentedTab<TaskStatus>[] = [
	{ id: "todo", label: translation.Tasks.StatusTodo, icon: "empty-page" },
	{ id: "doing", label: translation.Tasks.StatusDoing, icon: "play" },
	{ id: "done", label: translation.Tasks.StatusDone, icon: "check-circle" },
];

interface TaskDetailPaneProps {
	/** The task being worked on, or null while one is being written. */
	task: Task | null;
	projectPath: string;
	projectName: string;
	presets: PromptPreset[];
	onSaveTask: (input: TaskInput) => void;
	/** Closing a task out, from the place it is being read. */
	onSetStatus: (status: TaskStatus) => void;
	onDeleteTask: () => void;
	/** Takes the user to the agent the prompt was just handed to. */
	onSent: () => void;
}

/**
 * A task, and the prompt it becomes — whether it exists yet or not.
 *
 * The fields on the left are the task as a person reads it; the text on the
 * right is what an agent is given. Editing the prompt belongs to this run
 * alone — saving writes the fields back, never the generated text.
 *
 * Writing a new task uses this same pane, minus the parts a task has to exist
 * to have: where it has got to, what it has been handed to, and deleting it.
 * They appear the moment it is saved.
 */
function saveLabel(saved: boolean, hasTask: boolean): string {
	if (saved) return translation.GlobalTerm.Saved;
	if (hasTask) return translation.Tasks.SaveToTask;

	return translation.GlobalTerm.Save;
}

export function TaskDetailPane({
	task,
	projectPath,
	projectName,
	presets,
	onSaveTask,
	onSetStatus,
	onDeleteTask,
	onSent,
}: Readonly<TaskDetailPaneProps>) {
	const { t } = useTranslation();
	const { draft, patch, reset, prompt, built, isEdited, setEdited, regenerate, suggestedPresetId } =
		usePromptDraft(projectPath, projectName, presets);
	const [copied, setCopied] = useState(false);
	const [saved, setSaved] = useState(false);
	const [historyKey, setHistoryKey] = useState(0);

	// Loaded when the selection changes, and only then: what the user types
	// afterwards is theirs until they save it back to the task.
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
			deadline: task.deadline,
		});
	}, [task, patch, reset]);

	const copy = async () => {
		await navigator.clipboard.writeText(prompt);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const save = () => {
		onSaveTask({
			projectPath,
			name: draft.taskName.trim() || task?.name || "",
			description: draft.description,
			requirements: draft.requirements,
			notes: draft.notes,
			presetId: draft.presetId,
			priority: draft.priority,
			deadline: draft.deadline,
		});

		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const send = (session: PtySession) => {
		if (!task || !prompt.trim()) return;

		// Pasted rather than typed: a prompt is many lines, and a terminal submits
		// on every newline it is sent. The paste waits for the terminal if the
		// agents page is not on screen yet.
		pasteIntoTerminal(session.runId, prompt.trim());

		void globalThis.lazify
			.recordTaskRun({
				taskId: task.id,
				agentRunId: session.runId,
				agentLabel: session.scriptName,
				presetId: built?.presetId ?? null,
				generatedPrompt: prompt.trim(),
			})
			.then(() => setHistoryKey((current) => current + 1));

		onSent();
	};

	const nameless = !draft.taskName.trim() && !task;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<CaptionText tone="muted">
					{t(task ? translation.Tasks.PromptHint : translation.Tasks.AddTaskHint)}
				</CaptionText>

				<div className="flex shrink-0 items-center gap-2">
					{/* Where a task is set by hand, from the place it is being read.
              Whatever moves a task on its own, the person reading it always
              has the final say — and a say that takes one click. */}
					{task ? (
						<SegmentedTabs tabs={STATUS_TABS} active={task.status} onSelect={onSetStatus} />
					) : null}

					{task ? (
						<button
							type="button"
							onClick={onDeleteTask}
							aria-label={t(translation.Tasks.DeleteTask)}
							className={clsx(
								"flex h-8 w-8 items-center justify-center rounded-full border border-border",
								"text-muted transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error",
							)}
						>
							<UiIcon name="trash" className="h-3.5 w-3.5" />
						</button>
					) : null}

					{/* This pane stays open after saving, so the button says so itself —
              there is no modal closing to stand in for a confirmation. */}
					<button
						type="button"
						onClick={save}
						disabled={nameless}
						className={clsx(
							"flex shrink-0 items-center gap-2 rounded-full border border-transparent bg-accent",
							"px-5 py-2 text-[12px] font-semibold text-bg shadow-sm",
							"transition-colors duration-150 hover:bg-accentHover",
							"disabled:cursor-not-allowed disabled:bg-accent/60",
						)}
					>
						<UiIcon name="check-circle" className="h-3.5 w-3.5" />
						{t(saveLabel(saved, Boolean(task)))}
					</button>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 gap-4">
				<div className="flex min-h-0 w-[42%] flex-col gap-3">
					<PromptComposer
						draft={draft}
						presets={presets}
						suggestedPresetId={suggestedPresetId}
						onPatch={patch}
					/>

					<TaskMetaFields draft={draft} onPatch={patch} />
				</div>

				<div className="flex min-h-0 flex-1 flex-col">
					<PromptPreviewPane
						prompt={prompt}
						isEdited={isEdited}
						contextCount={built?.usedEntryIds.length ?? 0}
						onEdit={setEdited}
						onRegenerate={regenerate}
					/>
				</div>
			</div>

			{/* A task that does not exist yet has been handed to nobody. */}
			{task ? (
				<div className="max-h-28 shrink-0 overflow-y-auto rounded-xl border border-border bg-soft px-3 py-2">
					<TaskRunHistory key={historyKey} taskId={task.id} />
				</div>
			) : null}

			<div className="flex shrink-0 items-center justify-end gap-2">
				<button
					type="button"
					onClick={() => void copy()}
					disabled={!prompt.trim()}
					className={clsx(
						"flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2",
						"text-[12px] text-text hover:border-accent/40",
						"disabled:cursor-not-allowed disabled:opacity-40",
					)}
				>
					<UiIcon name={copied ? "check-circle" : "code"} className="h-3.5 w-3.5" />
					{t(copied ? translation.GlobalTerm.Done : translation.PromptBuilder.Copy)}
				</button>

				{/* Handing it over records the run against the task, so there has to be
            a task first. Saving is one click away and the picker comes back. */}
				{task ? <SendToAgentPicker disabled={!prompt.trim()} onSend={send} /> : null}
			</div>
		</div>
	);
}
