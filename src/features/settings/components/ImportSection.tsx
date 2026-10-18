import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { appRoute } from "@/app/app-routes";
import { translation } from "@/i18n/translation";
import { BodyText, SmallText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { SectionLabel } from "./SectionLabel";

const ACTION_BUTTON = clsx(
	"flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-1.5",
	"text-xs font-semibold text-muted transition-colors duration-150",
	"hover:border-accent/30 hover:text-text",
);

/** The first-launch import, offered again (D-8). Running it twice adds only what's new. */
export function ImportSection() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<div className="border-t border-border pt-6">
			<SectionLabel>{t(translation.Settings.ImportData)}</SectionLabel>

			<div className="rounded-2xl border border-border bg-soft px-5 py-4">
				<div className="flex items-center justify-between gap-6">
					<div className="min-w-0 flex-1">
						<BodyText className="font-semibold">{t(translation.Settings.ImportSource)}</BodyText>
						<SmallText className="mt-0.5 block leading-5">{t(translation.Settings.ImportDesc)}</SmallText>
					</div>

					<button type="button" onClick={() => navigate(appRoute.electronImport)} className={clsx(ACTION_BUTTON, "shrink-0")}>
						<UiIcon name="download" className="h-3.5 w-3.5" />
						{t(translation.Settings.ImportAction)}
					</button>
				</div>
			</div>
		</div>
	);
}
