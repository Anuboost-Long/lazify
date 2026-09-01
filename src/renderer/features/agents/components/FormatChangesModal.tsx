import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FormatOutcome } from "@main/formatting";
import { translation } from "@renderer/i18n/translation";
import { useProjectFormatter } from "@renderer/shared/hooks/use-formatter";
import { MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import { splitPath } from "../utils/paths";

/**
 * What formatting would do, before it does any of it.
 *
 * The list is a real dry run through the same code the Proceed button then
 * runs, so what is shown and what happens cannot drift apart. Nothing on disk
 * is touched until Proceed.
 */

interface FormatChangesModalProps {
	projectPath: string;
	open: boolean;
	onClose: () => void;
	onFormatted?: () => void;
}

/** One group of paths under a heading, shown only when it has any. */
function FileGroup({
	title,
	paths,
	tone,
}: Readonly<{ title: string; paths: string[]; tone: "accent" | "muted" | "error" }>) {
	if (paths.length === 0) return null;

	return (
		<div className="px-4 py-3">
			<div className="flex items-center gap-2">
				<SmallText as="span" className="!text-muted">
					{title}
				</SmallText>
				<MonoText as="span" className="!text-muted text-[11px]">
					{paths.length}
				</MonoText>
			</div>

			<ul className="mt-2 flex flex-col gap-1">
				{paths.map((entry) => {
					const { directory, name } = splitPath(entry);

					return (
						<li key={entry} className="flex items-baseline gap-2">
							<span
								aria-hidden
								className={clsx(
									"h-1 w-1 shrink-0 translate-y-[-2px] rounded-full",
									tone === "accent" && "bg-accent",
									tone === "muted" && "bg-muted",
									tone === "error" && "bg-error",
								)}
							/>
							<MonoText
								as="span"
								className={clsx(
									"min-w-0 flex-1 truncate text-[12px]",
									tone === "error" ? "!text-error" : "!text-text",
								)}
								title={entry}
							>
								{name}
								{directory ? <span className="text-muted">{`  ${directory}`}</span> : null}
							</MonoText>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export function FormatChangesModal({
	projectPath,
	open,
	onClose,
	onFormatted,
}: Readonly<FormatChangesModalProps>) {
	const { t } = useTranslation();
	const { busy, preview, format } = useProjectFormatter(projectPath);
	const [planned, setPlanned] = useState<FormatOutcome | null>(null);

	useEffect(() => {
		if (!open) {
			setPlanned(null);
			return;
		}

		let cancelled = false;

		void preview().then((result) => {
			if (!cancelled) setPlanned(result);
		});

		return () => {
			cancelled = true;
		};
	}, [open, preview]);

	if (!open) return null;

	const proceed = async () => {
		await format();
		onFormatted?.();
		onClose();
	};

	const willRewrite = planned?.formatted ?? [];
	const nothingToDo = planned !== null && willRewrite.length === 0;

	return (
		<BaseModal open onClose={onClose}>
			<div
				className={clsx(
					"flex max-h-[70vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
					"rounded-shell border border-border bg-soft shadow-panel",
				)}
			>
				<header className="flex items-center gap-2 border-b border-border px-4 py-3">
					<UiIcon name="sparks" className="h-4 w-4 text-accent" />
					<SmallText as="span" className="!text-text flex-1 truncate font-semibold">
						{t(translation.Agents.FormatTitle)}
					</SmallText>
					<SmallText as="span" className="!text-muted truncate">
						{planned?.configFile
							? t(translation.Agents.FormatByProject, { config: planned.configFile })
							: t(translation.Agents.FormatByDefaults)}
					</SmallText>
				</header>

				<div className="min-h-0 flex-1 divide-y divide-border overflow-auto">
					{planned === null ? (
						<SmallText className="!text-muted block px-4 py-6 text-center">
							{t(translation.Agents.FormatChecking)}
						</SmallText>
					) : (
						<>
							{nothingToDo ? (
								<SmallText className="!text-muted block px-4 py-6 text-center">
									{t(translation.Agents.FormatNothingToDo)}
								</SmallText>
							) : null}

							<FileGroup
								title={t(translation.Agents.FormatWillRewrite)}
								paths={willRewrite}
								tone="accent"
							/>
							<FileGroup
								title={t(translation.Agents.FormatCannot)}
								paths={planned.failed.map((failure) => failure.path)}
								tone="error"
							/>
							<FileGroup
								title={t(translation.Agents.FormatAlreadyTidy)}
								paths={planned.unchanged}
								tone="muted"
							/>
						</>
					)}
				</div>

				<footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
					<button
						type="button"
						onClick={onClose}
						className={clsx(
							"h-9 rounded-lg px-4",
							"text-[12px] text-muted",
							"transition-colors hover:bg-text/[0.06] hover:text-text",
						)}
					>
						{t(translation.GlobalTerm.Cancel)}
					</button>

					<button
						type="button"
						onClick={() => void proceed()}
						disabled={busy || willRewrite.length === 0}
						className={clsx(
							"flex h-9 items-center gap-2 rounded-lg px-4",
							"border border-accent/40 bg-accent/10",
							"text-[12px] font-semibold text-accent",
							"transition-colors hover:bg-accent/15",
							"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent/10",
						)}
					>
						<UiIcon name="check-circle" className="h-3.5 w-3.5" />
						{t(translation.Agents.FormatProceed, { count: willRewrite.length })}
					</button>
				</footer>
			</div>
		</BaseModal>
	);
}
