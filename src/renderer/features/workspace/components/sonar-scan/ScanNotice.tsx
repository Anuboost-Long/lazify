import { CaptionText, SmallText } from "@renderer/shared/typography";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ScanNoticeProps {
	icon: UiIconName;
	title: string;
	hint?: string;
}

/** Everything the panel says when there is no list to show. */
export function ScanNotice({ icon, title, hint }: Readonly<ScanNoticeProps>) {
	return (
		<div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
			<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted">
				<UiIcon name={icon} className="h-4 w-4" />
			</span>
			<SmallText as="span" className="!text-text">
				{title}
			</SmallText>
			{hint ? (
				<CaptionText tone="muted" className="max-w-sm">
					{hint}
				</CaptionText>
			) : null}
		</div>
	);
}
