import clsx from "clsx";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ScanFileFindings } from "@main/linting";
import { commonFolder, phaseOptions, planFixPhases } from "@main/linting/scan/phase-plan";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SectionTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface FixPhaseModalProps {
	open: boolean;
	projectPath: string;
	files: ScanFileFindings[];
	/** Absent where nothing above this can hand work to an agent. */
	onSendPhase?: (files: ScanFileFindings[]) => void;
	onCreated: (count: number) => void;
	onClose: () => void;
}

/**
 * How many rounds the fixing takes, decided before anything is written down.
 *
 * The split shown here is the split the tasks are made from — same planner, same
 * input — so what is approved is what lands on the board.
 */
export function FixPhaseModal(props: Readonly<FixPhaseModalProps>) {
	return (
		<BaseModal open={props.open} onClose={props.onClose}>
			{props.open ? <PhaseCard {...props} /> : null}
		</BaseModal>
	);
}

function PhaseCard({
	projectPath,
	files,
	onSendPhase,
	onCreated,
	onClose,
}: Readonly<FixPhaseModalProps>) {
	const { t } = useTranslation();
	const [phaseCount, setPhaseCount] = useState(() => Math.min(3, Math.max(1, files.length)));
	const [busy, setBusy] = useState(false);

	const options = useMemo(() => phaseOptions(files.length), [files.length]);
	const phases = useMemo(() => planFixPhases(files, phaseCount), [files, phaseCount]);

	const create = async () => {
		setBusy(true);

		const tasks = await globalThis.lazify
			.createPhaseTasks({ projectPath, phaseCount })
			.catch(() => []);

		setBusy(false);
		onCreated(tasks.length);
		onClose();
	};

	return (
		<div className="flex max-h-[80vh] w-[min(620px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
			<header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
				<div className="min-w-0">
					<SectionTitle>{t(translation.SonarScan.PhaseTitle)}</SectionTitle>
					<CaptionText tone="muted" className="mt-0.5 block">
						{t(translation.SonarScan.PhaseDescription)}
					</CaptionText>
				</div>

				<button
					type="button"
					onClick={onClose}
					aria-label={t(translation.GlobalTerm.Close)}
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
				>
					<UiIcon name="xmark" className="h-4 w-4" />
				</button>
			</header>

			<div className="flex items-center gap-2 border-b border-border px-6 py-3">
				<CaptionText tone="muted" className="shrink-0">
					{t(translation.SonarScan.PhaseCount)}
				</CaptionText>

				<div className="flex flex-wrap gap-1">
					{options.map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setPhaseCount(option)}
							aria-pressed={option === phaseCount}
							className={clsx(
								"h-7 w-7 rounded-md text-xs font-semibold tabular-nums transition-colors",
								option === phaseCount
									? "bg-accent text-white"
									: "border border-border text-muted hover:border-accent/40 hover:text-text",
							)}
						>
							{option}
						</button>
					))}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{phases.map((phase) => (
					<div
						key={phase.index}
						className="flex items-center gap-3 border-b border-border/60 px-6 py-2.5 last:border-b-0"
					>
						<div className="min-w-0 flex-1">
							<SmallText as="span" className="block !text-text">
								{t(translation.SonarScan.PhaseName, { index: phase.index })}
								<span className="text-muted">
									{" · "}
									{t(translation.SonarScan.PhaseFiles, { count: phase.files.length })}
									{" · "}
									{t(translation.CodeQuality.FindingCount, { count: phase.findingCount })}
								</span>
							</SmallText>
							<MonoText as="span" className="block truncate text-[11px] !text-muted">
								{commonFolder(phase.files) || phase.files[0]?.path}
							</MonoText>
						</div>

						{onSendPhase ? (
							<button
								type="button"
								onClick={() => onSendPhase(phase.files)}
								className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted transition-colors hover:bg-accent/10 hover:text-accent"
							>
								{t(translation.CodeQuality.FixWithAgent)}
							</button>
						) : null}
					</div>
				))}
			</div>

			<footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
				<button
					type="button"
					disabled={busy || phases.length === 0}
					onClick={() => void create()}
					className="inline-flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
				>
					<UiIcon
						name={busy ? "refresh-circle" : "check-circle"}
						className={clsx("h-3.5 w-3.5", busy && "animate-spin")}
					/>
					{t(translation.SonarScan.CreateTasks, { count: phases.length })}
				</button>
			</footer>
		</div>
	);
}
