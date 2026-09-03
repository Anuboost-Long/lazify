import type { ReactNode } from "react";

import { CaptionText, PillText } from "@renderer/shared/typography";

interface LabelledFieldProps {
	label: string;
	hint?: string;
	children: ReactNode;
}

export function LabelledField({ label, hint, children }: Readonly<LabelledFieldProps>) {
	return (
		<label className="flex flex-col gap-1.5">
			<PillText as="span">{label}</PillText>
			{children}
			{hint ? <CaptionText as="span">{hint}</CaptionText> : null}
		</label>
	);
}
