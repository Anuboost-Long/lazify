import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { usePreferredPackageManager } from "@renderer/shared/hooks/use-preferred-package-manager";
import type { DetectedTool } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { PackageManagerModal } from "./PackageManagerModal";
import { SectionLabel } from "./SectionLabel";
import { SettingRow } from "./SettingRow";

const JS_PM_NAMES = new Set(["npm", "yarn", "pnpm", "bun"]);

export function JsToolsSection() {
	const { t } = useTranslation();
	const { preferredPm, setPreferredPm } = usePreferredPackageManager();
	const [scanning, setScanning] = useState(false);
	const [detectedTools, setDetectedTools] = useState<DetectedTool[]>([]);
	const [modalOpen, setModalOpen] = useState(false);

	async function handleScan() {
		setScanning(true);
		try {
			const report = await globalThis.lazify.scanTools();
			const pmTools = report.tools.filter((t) => JS_PM_NAMES.has(t.name));
			setDetectedTools(pmTools);
		} finally {
			setScanning(false);
			setModalOpen(true);
		}
	}

	return (
		<>
			<div className="border-t border-border pt-6">
				<SectionLabel>{t(translation.Settings.JsTools)}</SectionLabel>
				<div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
					<div className="px-5">
						<SettingRow
							label={t(translation.Settings.JsPackageManager)}
							description={t(translation.Settings.JsPackageManagerDesc)}
						>
							<div className="flex items-center gap-2">
								{/* Current selection badge */}
								<span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent">
									{preferredPm}
								</span>

								{/* Scan button */}
								<button
									type="button"
									onClick={handleScan}
									disabled={scanning}
									className={clsx(
										"flex items-center gap-1.5 rounded-[14px] border border-border bg-bg px-3 py-1.5",
										"text-xs font-semibold text-muted transition-colors duration-150",
										"hover:border-accent/30 hover:text-text",
										"disabled:cursor-not-allowed disabled:opacity-50",
									)}
								>
									<UiIcon
										name="refresh-circle"
										className={clsx("h-3.5 w-3.5", scanning && "animate-spin")}
									/>
									{scanning
										? t(translation.GlobalTerm.Scanning)
										: t(translation.Settings.ScanPackageManagers)}
								</button>
							</div>
						</SettingRow>
					</div>
				</div>
			</div>

			<PackageManagerModal
				open={modalOpen}
				tools={detectedTools}
				current={preferredPm}
				onSelect={setPreferredPm}
				onClose={() => setModalOpen(false)}
			/>
		</>
	);
}
