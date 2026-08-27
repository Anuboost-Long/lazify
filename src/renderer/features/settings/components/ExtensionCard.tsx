import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { ExtensionState, InstallJob } from "@main/extensions";
import { translation } from "@renderer/i18n/translation";
import { isInstalling } from "@renderer/shared/hooks/use-extensions";
import { BodyText, CaptionText, SmallText } from "@renderer/shared/typography";

import { ExtensionInstallProgress } from "./ExtensionInstallProgress";
import { ToggleSwitch } from "./ToggleSwitch";

interface ExtensionCardProps {
	extension: ExtensionState;
	busy: boolean;
	/** The install running or last finished for this extension, if any. */
	job?: InstallJob;
	onInstall: () => void;
	onRemove: () => void;
	onToggle: (enabled: boolean) => void;
}

function statusLabel({ status, installed, unreachable, requirement }: ExtensionState): string {
	if (unreachable && !installed) return translation.Extensions.Unreachable;
	if (!requirement.satisfied) return translation.Extensions.Blocked;

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
	job,
	onInstall,
	onRemove,
	onToggle,
}: Readonly<ExtensionCardProps>) {
	const { t } = useTranslation();
	const { entry, installed, latest, requirement, status } = extension;
	const active = Boolean(installed?.enabled) && requirement.satisfied;
	const installing = isInstalling(job);

	/**
	 * Nothing is downloaded for an engine that could not run once it landed. The
	 * runtime is set up first, and `Check for updates` is what looks again.
	 */
	const blocked = !requirement.satisfied && !installed;

	/**
	 * An engine already on disk whose runtime has gone is offered removal rather
	 * than the update it cannot use — otherwise the only button on the card is
	 * one that does nothing.
	 */
	const removable = Boolean(installed) && (status === "installed" || !requirement.satisfied);

	return (
		<div className="py-4">
			<div className="flex items-start justify-between gap-6">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<BodyText className="font-semibold">{entry.displayName}</BodyText>
						<span
							aria-hidden
							className={clsx(
								"h-1.5 w-1.5 shrink-0 rounded-full",
								!requirement.satisfied && "bg-warning",
								requirement.satisfied && status === "update-available" && "bg-warning",
								requirement.satisfied && status === "installed" && (active ? "bg-accent" : "bg-border"),
								requirement.satisfied && status === "not-installed" && "bg-border",
							)}
						/>
						<CaptionText tone="muted">{t(statusLabel(extension))}</CaptionText>
					</div>

					<SmallText className="mt-0.5 leading-5">{entry.summary}</SmallText>

					{requirement.label ? (
						<div className="mt-1.5 flex flex-wrap items-center gap-2">
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
							{blocked ? (
								<CaptionText tone="muted">{t(translation.Extensions.RecheckHint)}</CaptionText>
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
						disabled={installing || busy || blocked}
						onClick={removable ? onRemove : onInstall}
						className={clsx(
							"h-9 rounded-lg border px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
							removable
								? "border-border text-muted hover:border-danger/30 hover:text-danger"
								: "border-accent/30 text-accent hover:border-accent",
						)}
					>
						{t(
							installing || busy
								? translation.Extensions.Working
								: removable
									? translation.Extensions.Remove
									: status === "update-available"
										? translation.Extensions.Update
										: translation.Extensions.Install,
						)}
					</button>
				</div>
			</div>

			{installing ? <ExtensionInstallProgress job={job as InstallJob} /> : null}

			{job?.stage === "failed" && job.error ? (
				<CaptionText className="mt-2 block !text-error">
					{t(translation.Extensions.InstallFailed)} — {job.error}
				</CaptionText>
			) : null}
		</div>
	);
}
