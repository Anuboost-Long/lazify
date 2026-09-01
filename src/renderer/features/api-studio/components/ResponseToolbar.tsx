import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";

export type ResponseTab = "body" | "headers";

interface ResponseToolbarProps {
	tab: ResponseTab;
	raw: boolean;
	/** A body that is not JSON has nothing to pretty-print, so the choice is off. */
	formattable: boolean;
	onRawChange: (raw: boolean) => void;
	onTabChange: (tab: ResponseTab) => void;
}

const BUTTON = "rounded-md px-2 py-1 text-[11px] font-medium transition-colors";

export function ResponseToolbar({
	tab,
	raw,
	formattable,
	onRawChange,
	onTabChange,
}: Readonly<ResponseToolbarProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-1">
			{tab === "body" ? (
				<div className="mr-1 flex items-center gap-1">
					<button
						type="button"
						onClick={() => onRawChange(false)}
						disabled={!formattable}
						title={formattable ? undefined : t(translation.ApiStudio.CannotFormat)}
						className={clsx(
							BUTTON,
							"disabled:cursor-not-allowed disabled:opacity-40",
							!raw && formattable ? "bg-text/[0.06] text-text" : "text-muted hover:text-text",
						)}
					>
						{t(translation.ApiStudio.BodyPretty)}
					</button>
					<button
						type="button"
						onClick={() => onRawChange(true)}
						className={clsx(
							BUTTON,
							raw || !formattable ? "bg-text/[0.06] text-text" : "text-muted hover:text-text",
						)}
					>
						{t(translation.ApiStudio.BodyRaw)}
					</button>
				</div>
			) : null}

			{(["body", "headers"] as ResponseTab[]).map((responseTab) => (
				<button
					key={responseTab}
					type="button"
					onClick={() => onTabChange(responseTab)}
					className={clsx(
						BUTTON,
						tab === responseTab ? "bg-text/[0.06] text-text" : "text-muted hover:text-text",
					)}
				>
					{t(responseTab === "body" ? translation.ApiStudio.Body : translation.ApiStudio.Headers)}
				</button>
			))}
		</div>
	);
}
