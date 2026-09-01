import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useExtensions } from "@renderer/shared/hooks/use-extensions";
import { CaptionText, SmallText } from "@renderer/shared/typography";

import { ExtensionCard } from "./ExtensionCard";
import { SectionLabel } from "./SectionLabel";

export function ExtensionsSection() {
	const { t } = useTranslation();
	const { extensions, loading, busyId, jobs, error, refresh, install, remove, setEnabled } =
		useExtensions(true);

	return (
		<div>
			<div className="mb-4 flex items-end justify-between gap-4">
				<div className="min-w-0">
					<SectionLabel>{t(translation.Extensions.Title)}</SectionLabel>
					<SmallText className="leading-5">{t(translation.Extensions.Description)}</SmallText>
				</div>

				<button
					type="button"
					disabled={loading}
					onClick={refresh}
					className="h-9 shrink-0 rounded-lg border border-border px-3 text-xs text-muted transition-colors hover:border-accent/30 hover:text-text disabled:opacity-40"
				>
					{t(loading ? translation.Extensions.Checking : translation.Extensions.CheckForUpdates)}
				</button>
			</div>

			{error ? <CaptionText className="mb-2 block !text-danger">{error}</CaptionText> : null}

			<div className="divide-y divide-border rounded-2xl border border-border px-4">
				{extensions.map((extension) => (
					<ExtensionCard
						key={extension.entry.id}
						extension={extension}
						busy={busyId === extension.entry.id}
						job={jobs[extension.entry.id]}
						onInstall={() => install(extension.entry.id)}
						onRemove={() => remove(extension.entry.id)}
						onToggle={(enabled) => setEnabled(extension.entry.id, enabled)}
					/>
				))}
			</div>

			<CaptionText tone="muted" className="mt-3 block">
				{t(translation.Extensions.SourceNote)}
			</CaptionText>
		</div>
	);
}
