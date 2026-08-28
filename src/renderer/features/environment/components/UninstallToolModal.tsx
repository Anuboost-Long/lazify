import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { DetectedTool } from "@renderer/shared/types/lazify";
import { BodyText, MonoText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import { CodeField } from "@renderer/shared/ui/code/CodeField";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface UninstallToolModalProps {
	tool: DetectedTool | null;
	open: boolean;
	onClose: () => void;
	onUninstalled: (toolName: string) => void;
}

type UninstallState = "confirm" | "removing" | "done";

const ACCENT_LINE = {
	background: "linear-gradient(to right, transparent, var(--color-error), transparent)",
	opacity: 0.55,
} as const;

/**
 * The counterpart to InstallToolModal, kept as its own screen rather than a
 * mode of that one: the command it runs is destructive, so the confirm step
 * shows it plainly and the accent is the error colour throughout.
 */
export function UninstallToolModal({
	tool,
	open,
	onClose,
	onUninstalled,
}: Readonly<UninstallToolModalProps>) {
	const { t } = useTranslation();
	const [state, setState] = useState<UninstallState>("confirm");
	const [output, setOutput] = useState("");
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (open) {
			setState("confirm");
			setOutput("");
			setSuccess(false);
		}
	}, [open]);

	const handleUninstall = useCallback(async () => {
		if (!tool) return;
		setState("removing");
		const result = await globalThis.lazify.uninstallTool(tool.name);
		setOutput(result.output);
		setSuccess(result.success);
		setState("done");
		if (result.success) onUninstalled(tool.name);
	}, [tool, onUninstalled]);

	return (
		<BaseModal
			open={open}
			onClose={state === "removing" ? undefined : onClose}
			cancellable={state !== "removing"}
		>
			<div className="w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-shell border border-border bg-soft shadow-panel">
				{/* Header */}
				<div className="relative overflow-hidden border-b border-border px-6 py-5">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
					<div className="flex items-center justify-between gap-4">
						<div>
							<OverlineText className="text-muted">{t(translation.UninstallToolModal.Title)}</OverlineText>
							<SectionTitle className="mt-1 text-2xl">{tool?.displayName}</SectionTitle>
						</div>
						{state !== "removing" && (
							<button
								type="button"
								onClick={onClose}
								className="rounded-xl border border-border bg-bg p-2 text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
							>
								<UiIcon name="xmark" className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{/* Body */}
				<div className="p-6">
					{/* Confirm */}
					{state === "confirm" && tool && (
						<div className="space-y-4">
							<BodyText className="text-muted">
								{t(translation.UninstallToolModal.WillRun, { name: tool.displayName })}
							</BodyText>

							<div className="rounded-[16px] border border-border bg-bg px-4 py-3">
								<OverlineText className="mb-2 text-muted">{t(translation.GlobalTerm.Command)}</OverlineText>
								<MonoText as="code" className="break-all text-sm text-error">
									{tool.uninstallCommand}
								</MonoText>
							</div>

							<div className="flex items-start gap-2.5 rounded-[16px] border border-border/60 bg-bg/60 px-3.5 py-3">
								<UiIcon name="warning-triangle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
								<BodyText className="text-xs text-muted">
									{t(translation.UninstallToolModal.KeepsSessions)}
								</BodyText>
							</div>
						</div>
					)}

					{/* Removing */}
					{state === "removing" && (
						<div className="flex flex-col items-center gap-4 py-6">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-error/20 bg-error/10 text-error">
								<UiIcon name="refresh-circle" className="h-6 w-6 animate-spin" />
							</div>
							<div className="text-center">
								<BodyText className="font-semibold text-text">
									{t(translation.UninstallToolModal.Removing, { name: tool?.displayName })}
								</BodyText>
								<BodyText className="mt-1 text-xs text-muted">
									{t(translation.InstallToolModal.InstallingDesc)}
								</BodyText>
							</div>
						</div>
					)}

					{/* Done */}
					{state === "done" && (
						<div className="space-y-3">
							<div
								className={clsx(
									"rounded-[20px] border px-4 py-4",
									success ? "border-success/20 bg-success/5" : "border-error/20 bg-error/5",
								)}
							>
								<div className="flex items-start gap-3">
									<div
										className={clsx(
											"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
											success
												? "border-success/25 bg-success/10 text-success"
												: "border-error/25 bg-error/10 text-error",
										)}
									>
										<UiIcon name={success ? "check-circle" : "warning-triangle"} className="h-4 w-4" />
									</div>
									<div>
										<BodyText className={clsx("font-semibold", success ? "text-success" : "text-error")}>
											{success
												? t(translation.UninstallToolModal.RemoveSuccess, { name: tool?.displayName })
												: t(translation.UninstallToolModal.RemoveFailed)}
										</BodyText>
										<BodyText className="mt-1 text-xs text-muted">
											{success
												? t(translation.UninstallToolModal.SuccessDesc)
												: t(translation.InstallToolModal.FailedDesc)}
										</BodyText>
									</div>
								</div>
							</div>

							{output && (
								<CodeField className="max-h-40 overflow-y-auto rounded-[16px] border border-border bg-bg px-4 py-3 font-mono text-[10px] leading-5 text-muted/70 whitespace-pre-wrap">
									{output}
								</CodeField>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
					{state === "confirm" && (
						<>
							<button
								type="button"
								onClick={onClose}
								className="rounded-[16px] border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent/30 hover:text-text"
							>
								{t(translation.GlobalTerm.Cancel)}
							</button>
							<button
								type="button"
								onClick={handleUninstall}
								className="rounded-[16px] border border-transparent bg-error px-5 py-2.5 text-sm font-semibold text-bg transition-[opacity] duration-150 hover:opacity-90"
							>
								{t(translation.GlobalTerm.Uninstall)}
							</button>
						</>
					)}

					{state === "done" && (
						<button
							type="button"
							onClick={onClose}
							className="rounded-[16px] border border-transparent bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-[background-color] duration-150 hover:bg-accentHover"
						>
							{t(translation.GlobalTerm.Done)}
						</button>
					)}
				</div>
			</div>
		</BaseModal>
	);
}
