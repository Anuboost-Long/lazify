import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { CaptionText, PageTitle, SmallText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

export function FatalErrorScreen() {
	const { t } = useTranslation();
	const [logFile, setLogFile] = useState<string | null>(null);

	useEffect(() => {
		void globalThis.lazify
			.getDiagnosticsPaths()
			.then((paths) => setLogFile(paths.logFile))
			.catch(() => undefined);
	}, []);

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-bg px-6">
			<div className="flex max-w-xl flex-col items-center gap-3">
				<span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-error/30 bg-error/6 text-error">
					<UiIcon name="warning-triangle" className="h-6 w-6" />
				</span>

				<PageTitle className="text-center">{t(translation.FatalError.Title)}</PageTitle>
				<CaptionText tone="muted" className="text-center">
					{t(translation.FatalError.Message)}
				</CaptionText>

				{logFile ? (
					<SmallText className="text-muted! max-w-full truncate font-mono">{logFile}</SmallText>
				) : null}
			</div>

			<button
				type="button"
				onClick={() => globalThis.location.reload()}
				className={clsx(
					"flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2",
					"transition-transform duration-200",
					"hover:-translate-y-0.5 active:scale-[0.98]",
				)}
			>
				<UiIcon name="refresh-circle" className="h-3.5 w-3.5 text-accent" />
				<SmallText className="text-accent!">{t(translation.FatalError.Reload)}</SmallText>
			</button>
		</div>
	);
}
