import clsx from "clsx";

import { BodyText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface WarningNoticeProps {
	/** Already translated, or straight from the main process. */
	message: string;
	/** Optional heading above the message, for the two-line form. */
	title?: string;
}

/**
 * Something the user should read but that did not stop the work — a bundle that
 * could not be inspected, or a build that came out plainer than asked for.
 */
export function WarningNotice({ message, title }: Readonly<WarningNoticeProps>) {
	return (
		<div
			className={clsx(
				"flex items-start gap-3",
				"border border-warning/30 rounded-2xl bg-warning/[0.06] px-4 py-3",
				"animate-fadeIn",
			)}
		>
			<UiIcon name="warning-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />

			{title ? (
				<span className="min-w-0">
					<BodyText className="!text-warning">{title}</BodyText>
					<SmallText className="mt-0.5 block leading-relaxed !text-warning/90">{message}</SmallText>
				</span>
			) : (
				<SmallText className="!text-warning">{message}</SmallText>
			)}
		</div>
	);
}
