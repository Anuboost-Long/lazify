import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { ExtensionState } from "@main/extensions";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, SmallText } from "@renderer/shared/typography";

import { ToggleSwitch } from "./ToggleSwitch";

interface ExtensionCardProps {
	extension: ExtensionState;
	busy: boolean;
	onInstall: () => void;
	onRemove: () => void;
	onToggle: (enabled: boolean) => void;
}

function statusLabel({ status, installed, unreachable, requirement }: ExtensionState): string {
	if (unreachable && !installed) return translation.Extensions.Unreachable;
	if (installed && !requirement.satisfied) return translation.Extensions.Blocked;

	switch (status) {
		case "update-available":
			return translation.Extensions.UpdateAvailable;
		case "installed":
			return installed?.enabled ? translation.Extensions.Active : translation.Extensions.Disabled;
		default:
			return translation.Extensions.NotInstalled;
	}
}

export function ExtensionCard({
	extension,
	busy,
	onInstall,
	onRemove,
	onToggle,
}: Readonly<ExtensionCardProps>) {
	const { t } = useTranslation();
	const { entry, installed, latest, requirement, status } = extension;
	const active = Boolean(installed?.enabled) && requirement.satisfied;

	return (
		<div className="flex items-start justify-between gap-6 py-4">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<BodyText className="font-semibold">{entry.displayName}</BodyText>
					<span
						aria-hidden
						className={clsx(
							"h-1.5 w-1.5 shrink-0 rounded-full",
							status === "update-available" && "bg-warning",
							status === "installed" && (active ? "bg-accent" : "bg-border"),
							status === "not-installed" && "bg-border",
						)}
					/>
					<CaptionText tone="muted">{t(statusLabel(extension))}</CaptionText>
				</div>

				<SmallText className="mt-0.5 leading-5">{entry.summary}</SmallText>

				{requirement.label ? (
					<div className="mt-1.5 flex items-center gap-2">
						<CaptionText className="!text-warning">{t(requirement.label)}</CaptionText>
						{requirement.helpUrl ? (
							<button
								type="button"
								onClick={() => void globalThis.lazify.openExternalUrl(requirement.helpUrl as string)}
								className="text-xs text-accent transition-colors hover:text-accent-hover"
							>
								{t(translation.Extensions.HowToFix)}
							</button>
						) : null}
					</div>
				) : null}

				<CaptionText tone="muted" className="mt-1 block font-mono">
					{entry.id}
					{installed ? ` · v${installed.version}` : ""}
					{status === "update-available" && latest ? ` → v${latest.version}` : ""}
					{latest?.license ? ` · ${latest.license}` : ""}
				</CaptionText>
			</div>

			<div className="flex shrink-0 items-center gap-3">
				{installed && requirement.satisfied ? (
					<ToggleSwitch enabled={active} onChange={onToggle} />
				) : null}

				<button
					type="button"
					disabled={busy}
					onClick={status === "installed" ? onRemove : onInstall}
					className={clsx(
						"h-9 rounded-lg border px-3 text-xs transition-colors disabled:opacity-40",
						status === "installed"
							? "border-border text-muted hover:border-danger/30 hover:text-danger"
							: "border-accent/30 text-accent hover:border-accent",
					)}
				>
					{t(
						busy
							? translation.Extensions.Working
							: status === "update-available"
								? translation.Extensions.Update
								: status === "installed"
									? translation.Extensions.Remove
									: translation.Extensions.Install,
					)}
				</button>
			</div>
		</div>
	);
}
