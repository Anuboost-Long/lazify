import { BodyText } from "@renderer/shared/typography";

export function SectionEmpty({ message }: Readonly<{ message: string }>) {
	return <BodyText className="py-1 text-[11px] text-muted">{message}</BodyText>;
}

// ─── Main component ───────────────────────────────────────────────────────────
