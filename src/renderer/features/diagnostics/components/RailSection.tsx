import type { ReactNode } from "react";

import { PillText } from "@renderer/shared/typography";

interface RailSectionProps {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}

export function RailSection({ title, action, children }: Readonly<RailSectionProps>) {
	return (
		<section>
			<header className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-3">
				<PillText as="h2">{title}</PillText>
				{action}
			</header>
			<div className="pb-1">{children}</div>
		</section>
	);
}
