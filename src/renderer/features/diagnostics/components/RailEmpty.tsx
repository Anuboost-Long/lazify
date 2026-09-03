import type { ReactNode } from "react";

import { CaptionText } from "@renderer/shared/typography";

interface RailEmptyProps {
	title: string;
	description: string;
	action?: ReactNode;
}

export function RailEmpty({ title, description, action }: Readonly<RailEmptyProps>) {
	return (
		<div className="flex flex-col items-start gap-2 px-3 py-2">
			<div>
				<CaptionText as="p" className="!text-text font-semibold">
					{title}
				</CaptionText>
				<CaptionText as="p" className="mt-0.5 leading-4">
					{description}
				</CaptionText>
			</div>
			{action}
		</div>
	);
}
