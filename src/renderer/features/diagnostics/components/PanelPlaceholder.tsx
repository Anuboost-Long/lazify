import type { ReactNode } from "react";

import { CardTitle, PageDescription } from "@renderer/shared/typography";

interface PanelPlaceholderProps {
	title: string;
	description: string;
	action?: ReactNode;
}

export function PanelPlaceholder({ title, description, action }: Readonly<PanelPlaceholderProps>) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
			<div className="max-w-sm">
				<CardTitle>{title}</CardTitle>
				<PageDescription className="mt-1.5">{description}</PageDescription>
			</div>
			{action}
		</div>
	);
}
