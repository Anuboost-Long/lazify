import type { ReactNode } from "react";

import { CaptionText, PillText } from "@renderer/shared/typography";

interface PanelSectionProps {
	title: string;
	count?: number;
	emptyMessage?: string;
	children?: ReactNode;
}

export function PanelSection({
	title,
	count,
	emptyMessage,
	children,
}: Readonly<PanelSectionProps>) {
	return (
		<section className="border-t border-border first:border-t-0">
			<header className="flex items-baseline gap-2 px-4 pb-1 pt-4">
				<PillText as="h2">{title}</PillText>
				{count === undefined ? null : (
					<CaptionText as="span" className="tabular-nums">
						{count}
					</CaptionText>
				)}
			</header>

			{children ?? (
				<CaptionText as="p" className="px-4 pb-4 pt-1">
					{emptyMessage}
				</CaptionText>
			)}
		</section>
	);
}
