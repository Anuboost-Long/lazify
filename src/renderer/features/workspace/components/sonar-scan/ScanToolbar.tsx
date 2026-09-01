import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { SonarScanState } from "@main/linting";
import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { CopyButton } from "@renderer/shared/ui/CopyButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ScanToolbarProps {
	state: SonarScanState | null;
	/** Built only when the button is pressed — the text is the whole report. */
	reportText: () => string;
	onScan: () => void;
	onStop: () => void;
	onFixInPhases: () => void;
}

function scanLabel(running: boolean, scanned: boolean): string {
	if (running) return translation.SonarScan.Stop;
	if (scanned) return translation.SonarScan.ScanAgain;

	return translation.SonarScan.Scan;
}

export function ScanToolbar({
	state,
	reportText,
	onScan,
	onStop,
	onFixInPhases,
}: Readonly<ScanToolbarProps>) {
	const { t } = useTranslation();
	const running = state?.status === "running";
	const report = state?.report ?? null;
	const progress = running && state.total > 0 ? (state.scanned / state.total) * 100 : 0;

	return (
		<div className="sticky top-0 z-10 border-b border-border bg-bg">
			<div className="flex flex-wrap items-center gap-2 px-3 py-2">
				<button
					type="button"
					onClick={running ? onStop : onScan}
					className={clsx(
						"inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors",
						running
							? "border border-border text-text hover:border-error/40 hover:text-error"
							: "bg-accent text-white hover:bg-accentHover",
					)}
				>
					<UiIcon
						name={running ? "stop-circle" : "radar"}
						className={clsx("h-3.5 w-3.5", running && "motion-safe:animate-pulse")}
					/>
					{t(scanLabel(running, Boolean(report)))}
				</button>

				<SmallText as="span" className="min-w-0 flex-1 truncate !text-muted">
					{running
						? t(translation.SonarScan.Scanning, {
								scanned: state.scanned,
								total: state.total,
							})
						: (state?.current ?? "")}
				</SmallText>

				{report && report.findingCount > 0 ? (
					<button
						type="button"
						onClick={onFixInPhases}
						className="shrink-0 rounded-[8px] border border-border px-2.5 py-1 text-xs text-accent transition-colors hover:border-accent/40"
					>
						{t(translation.SonarScan.FixInPhases)}
					</button>
				) : null}

				{report ? (
					<CopyButton
						value={reportText}
						label={t(translation.SonarScan.Copy)}
						copiedLabel={t(translation.SonarScan.Copied)}
						className="shrink-0 !text-xs"
					/>
				) : null}
			</div>

			{running ? (
				<div className="h-0.5 w-full bg-border">
					<div
						className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
			) : null}
		</div>
	);
}
