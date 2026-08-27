import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { InstallJob } from "@main/extensions";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";

interface ExtensionInstallProgressProps {
	job: InstallJob;
}

const STAGE_LABEL: Record<string, string> = {
	queued: translation.Extensions.StageQueued,
	downloading: translation.Extensions.StageDownloading,
	unpacking: translation.Extensions.StageUnpacking,
};

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * How far an install has got.
 *
 * Open VSX declares a length for these downloads and the bar tracks it, but a
 * chunked response declares nothing and unpacking has no length at all. Both
 * fall back to a bar that moves without measuring — a download with no number
 * on it still has to look like it is running, which is the whole reason this is
 * on the card.
 */
export function ExtensionInstallProgress({ job }: Readonly<ExtensionInstallProgressProps>) {
	const { t } = useTranslation();
	const measured = job.stage === "downloading" && job.totalBytes !== null && job.totalBytes > 0;
	const percent = measured ? Math.round((job.receivedBytes / (job.totalBytes as number)) * 100) : 0;

	return (
		<div className="mt-2">
			<div className="flex items-baseline justify-between gap-3">
				<CaptionText tone="muted">
					{t(STAGE_LABEL[job.stage] ?? translation.Extensions.StageQueued)}
					{measured ? ` ${percent}%` : ""}
				</CaptionText>

				{measured ? (
					<CaptionText tone="muted" className="shrink-0 tabular-nums">
						{formatBytes(job.receivedBytes)} / {formatBytes(job.totalBytes as number)}
					</CaptionText>
				) : null}
			</div>

			<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
				<div
					className={clsx(
						"h-full rounded-full bg-accent",
						measured
							? "transition-[width] duration-200"
							: "w-full opacity-40 motion-safe:animate-pulseLine motion-safe:opacity-100",
					)}
					style={measured ? { width: `${percent}%` } : undefined}
				/>
			</div>
		</div>
	);
}
