import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { ScanFileFindings, SonarScanReport } from "@main/linting";
import { buildScanReportText } from "@main/linting/scan/report-text";
import type { SonarScanFailure } from "@main/linting/scan/types";
import { getWorkspaceFileRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { useCodeQualityActions } from "@renderer/shared/ui/code/diagnostics/quality-actions";
import { Toast } from "@renderer/shared/ui/toast/Toast";

import { FixPhaseModal } from "./FixPhaseModal";
import { ScanFileGroup } from "./ScanFileGroup";
import { ScanNotice } from "./ScanNotice";
import { ScanToolbar } from "./ScanToolbar";
import { useSonarScan } from "./use-sonar-scan";

interface SonarScanPaneProps {
	projectPath: string;
}

/** Why a scan produced nothing: no engine to run, or nothing to run it on. */
function ScanFailure({ failure }: Readonly<{ failure: SonarScanFailure | null }>) {
	const { t } = useTranslation();
	const noEngines = failure === "no-engines";

	return (
		<ScanNotice
			icon={noEngines ? "warning-triangle" : "empty-page"}
			title={t(noEngines ? translation.SonarScan.NoEngines : translation.SonarScan.NoFiles)}
			hint={t(noEngines ? translation.SonarScan.NoEnginesHint : translation.SonarScan.ScopeHint)}
		/>
	);
}

/** What the last scan found, file by file. */
function ScanResults({
	report,
	onSendFiles,
	onOpen,
}: Readonly<{
	report: SonarScanReport;
	onSendFiles: ((files: ScanFileFindings[]) => void) | undefined;
	onOpen: (path: string, line: number) => void;
}>) {
	const { t } = useTranslation();

	return (
		<>
			<div className="flex flex-wrap items-baseline gap-x-2 px-3 py-2">
				<CaptionText tone="muted">
					{t(translation.SonarScan.FoundCount, {
						count: report.findingCount,
						files: report.files.length,
					})}
				</CaptionText>
				<CaptionText tone="muted" className="truncate">
					{t(translation.SonarScan.ScannedAt, { when: scannedAt(report) })}
				</CaptionText>
				{report.batch.total > report.batch.end - report.batch.start + 1 ? (
					<CaptionText tone="muted">
						{t(translation.SonarScan.BatchPosition, {
							from: report.batch.start,
							to: report.batch.end,
							total: report.batch.total,
						})}
					</CaptionText>
				) : null}
				{report.skippedCount > 0 ? (
					<CaptionText tone="muted">
						{t(translation.SonarScan.Skipped, { count: report.skippedCount })}
					</CaptionText>
				) : null}
			</div>

			<div className="border-t border-border">
				{report.files.map((file) => (
					<ScanFileGroup
						key={file.path}
						file={file}
						onFix={onSendFiles ? () => onSendFiles([file]) : undefined}
						onOpen={(line) => onOpen(file.path, line)}
					/>
				))}
			</div>
		</>
	);
}

/**
 * Every finding in the project's own code, in one list.
 *
 * The editor underlines the file in front of the reader; this answers the
 * question that file cannot — what the rest of the project looks like — and
 * hands the answer on: copied out whole, given to an agent as it stands, or cut
 * into rounds of work the board keeps.
 */
export function SonarScanPane({ projectPath }: Readonly<SonarScanPaneProps>) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const actions = useCodeQualityActions();
	const { state, start, stop } = useSonarScan(projectPath);
	const [choosingPhases, setChoosingPhases] = useState(false);
	const [createdCount, setCreatedCount] = useState<number | null>(null);

	const report = state?.report ?? null;
	const sendFiles = actions
		? (files: ScanFileFindings[]) => actions.fix(files.flatMap((file) => file.findings))
		: undefined;

	return (
		<div className="flex flex-col pb-6">
			<ScanToolbar
				state={state}
				reportText={() => (report ? buildScanReportText(report) : "")}
				onScan={start}
				onStop={stop}
				onFixInPhases={() => setChoosingPhases(true)}
			/>

			{state?.status === "failed" ? <ScanFailure failure={state.failure} /> : null}

			{!report && state?.status !== "failed" ? (
				<ScanNotice
					icon="radar"
					title={t(translation.SonarScan.NeverScanned)}
					hint={t(translation.SonarScan.ScopeHint)}
				/>
			) : null}

			{report?.files.length === 0 ? (
				<ScanNotice
					icon="check-circle"
					title={t(translation.SonarScan.Clean, { count: report.fileCount })}
					hint={t(translation.SonarScan.ScannedAt, { when: scannedAt(report) })}
				/>
			) : null}

			{report && report.files.length > 0 ? (
				<ScanResults
					report={report}
					onSendFiles={sendFiles}
					onOpen={(path, line) => navigate(getWorkspaceFileRoute(projectPath, path, line))}
				/>
			) : null}

			<FixPhaseModal
				open={choosingPhases}
				projectPath={projectPath}
				files={report?.files ?? []}
				onSendPhase={sendFiles}
				onCreated={setCreatedCount}
				onClose={() => setChoosingPhases(false)}
			/>

			{createdCount !== null ? (
				<Toast
					variant="success"
					title={t(translation.SonarScan.TasksCreated, { count: createdCount })}
					message={t(translation.SonarScan.TasksCreatedHint)}
					onClose={() => setCreatedCount(null)}
				/>
			) : null}
		</div>
	);
}

function scannedAt(report: SonarScanReport): string {
	const at = new Date(report.scannedAt);

	return `${at.toLocaleDateString()} ${at.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
}
