import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageCrumb } from "@/app/components/PageChrome";
import { translation } from "@/i18n/translation";
import type { CommandChoicePrompt } from "@/platform/command-runner";
import type { StarterFailureReason } from "@/shared/lib/scaffolding/starter-provisioner";
import type { EnvironmentSummary, LogEntry, WorkflowStatus } from "@/shared/types/lazify";
import { BodyText, SectionTitle, SmallText } from "@/shared/typography";
import UiIcon, { type UiIconName } from "@/shared/ui/icons/UiIcon";
import { LogPanel } from "@/shared/ui/LogPanel";
import { BaseModal } from "@/shared/ui/modal/BaseModal";
import { StarterFailureNotice } from "@/shared/ui/StarterFailureNotice";
import { Toast } from "@/shared/ui/toast/Toast";

interface ProjectCreationProgressPageProps {
	commandChoicePrompt: CommandChoicePrompt | null;
	environment: EnvironmentSummary | null;
	logs: LogEntry[];
	projectName: string;
	starterFailureReason: StarterFailureReason | null;
	statusMessage: string;
	workflowStatus: WorkflowStatus;
	onChooseCommandOption: (promptId: string, optionId: string) => void;
}

const STATUS_TONE: Partial<Record<WorkflowStatus, string>> = { error: "text-error", success: "text-success" };

function progressIconOf(status: WorkflowStatus): UiIconName {
	if (status === "error") return "warning-triangle";
	if (status === "success") return "check-circle";

	return "refresh-circle";
}

export function ProjectCreationProgressPage({
	commandChoicePrompt,
	environment,
	logs,
	projectName,
	starterFailureReason,
	statusMessage,
	workflowStatus,
	onChooseCommandOption,
}: Readonly<ProjectCreationProgressPageProps>) {
	const { t } = useTranslation();
	const [showSuccessToast, setShowSuccessToast] = useState(false);
	const [showErrorAlert, setShowErrorAlert] = useState(workflowStatus === "error");
	const prevStatusRef = useRef<WorkflowStatus>(workflowStatus);
	const progressIcon = progressIconOf(workflowStatus);
	const statusTone = STATUS_TONE[workflowStatus] ?? "text-muted";

	useEffect(() => {
		if (prevStatusRef.current === "running" && workflowStatus === "success") {
			setShowSuccessToast(true);
		}
		prevStatusRef.current = workflowStatus;
	}, [workflowStatus]);

	useEffect(() => {
		if (workflowStatus === "error") {
			setShowErrorAlert(true);
		} else if (workflowStatus === "running") {
			setShowErrorAlert(false);
		}
	}, [workflowStatus]);

	return (
		<div className="flex flex-col gap-6">
			<PageCrumb>
				<span className="text-xs text-muted/50">/</span>
				<span className="text-xs text-muted">{t(translation.Console.SetupStep)}</span>
				<span className="text-xs text-muted/50">/</span>
				<span className="text-xs font-medium text-text">{t(translation.Console.CreationStep)}</span>
			</PageCrumb>

			<header className="flex flex-col gap-2">
				<SectionTitle>{t(translation.Console.FlowTitle, { name: projectName })}</SectionTitle>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-1">
					<p
						aria-live="polite"
						className={clsx("inline-flex min-w-0 items-center gap-2", "text-sm font-medium", statusTone)}
					>
						<UiIcon
							name={progressIcon}
							className={clsx(
								"h-4 w-4 shrink-0",
								workflowStatus === "running" && "animate-spin motion-reduce:animate-none",
							)}
						/>
						<span className="min-w-0 wrap-break-word">{statusMessage || t(translation.Console.FlowDescription)}</span>
					</p>
					{environment ? (
						<p className="flex gap-3 font-mono text-xs text-muted">
							<span>Node {environment.nodeVersion}</span>
							<span>npm {environment.npmVersion}</span>
							<span>yarn {environment.yarnVersion}</span>
						</p>
					) : null}
				</div>
			</header>

			{starterFailureReason ? <StarterFailureNotice reason={starterFailureReason} /> : null}

			{commandChoicePrompt ? (
				<section
					aria-labelledby="command-choice-title"
					className={clsx("rounded-2xl", "bg-soft", "border border-accent/40", "p-5")}
				>
					<SmallText tone="accent" className="font-medium">
						{t(translation.Console.InputRequired)}
					</SmallText>
					<h2 id="command-choice-title" className="mt-1 text-base font-semibold text-text">
						{commandChoicePrompt.message}
					</h2>
					<SmallText className="mt-1">{t(translation.Console.ChooseOnlyDescription)}</SmallText>

					{/* A native group, so the choice is announced as one without a role. */}
					<fieldset className="mt-4 flex flex-wrap gap-2" aria-label={commandChoicePrompt.message}>
						{commandChoicePrompt.options.map((option) => (
							<button
								key={option.id}
								type="button"
								onClick={() => onChooseCommandOption(commandChoicePrompt.id, option.id)}
								className={clsx(
									"inline-flex h-9 items-center rounded-lg",
									"bg-bg",
									"border border-border",
									"text-sm font-medium text-text",
									"px-3.5",
									"transition-colors hover:border-accent hover:text-accent",
									"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
								)}
							>
								{option.label}
							</button>
						))}
					</fieldset>
				</section>
			) : null}

			<LogPanel logs={logs} />

			{showSuccessToast ? (
				<Toast
					variant="success"
					title={t(translation.Console.ProjectInitialized)}
					message={statusMessage}
					onClose={() => setShowSuccessToast(false)}
				/>
			) : null}

			{showErrorAlert ? (
				<BaseModal open onClose={() => setShowErrorAlert(false)}>
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="project-creation-error-title"
						aria-describedby="project-creation-error-message"
						className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-error/30 bg-soft shadow-panel"
					>
						<div className="flex items-start gap-3 px-5 pt-5">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-error/30 bg-error/10 text-error">
								<UiIcon name="warning-triangle" className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<SectionTitle id="project-creation-error-title" className="text-lg">
									{t(translation.Console.ProjectCreationFailed)}
								</SectionTitle>
								<BodyText id="project-creation-error-message" className="mt-2 wrap-break-word text-sm text-muted">
									{statusMessage}
								</BodyText>
							</div>
						</div>

						<div className="flex justify-end px-5 pb-5 pt-5">
							<button
								type="button"
								autoFocus
								onClick={() => setShowErrorAlert(false)}
								className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
							>
								{t(translation.GlobalTerm.Ok)}
							</button>
						</div>
					</div>
				</BaseModal>
			) : null}
		</div>
	);
}
