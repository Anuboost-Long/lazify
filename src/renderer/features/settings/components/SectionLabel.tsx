import type { ReactNode } from "react";

import { OverlineText } from "@renderer/shared/typography";

interface SectionLabelProps {
	children: ReactNode;
}

export function SectionLabel({ children }: Readonly<SectionLabelProps>) {
	return (
		<OverlineText tone="muted" className="mb-4">
			{children}
		</OverlineText>
	);
}
