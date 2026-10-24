import clsx from "clsx";

import type { TemplateCreateOption } from "@/shared/types/lazify";

interface TemplateOptionsPanelProps {
	options: TemplateCreateOption[];
	values: Record<string, boolean>;
	busy: boolean;
	onChange: (key: string, value: boolean) => void;
}

/**
 * Pre-flight toggles for scaffolder questions. Answering them here means the
 * CLI runs non-interactively and never stalls on a prompt the app cannot show.
 * Keys absent from `values` fall back to each option's declared default.
 */
export function TemplateOptionsPanel({ options, values, busy, onChange }: Readonly<TemplateOptionsPanelProps>) {
	if (options.length === 0) return null;

	return (
		<div className="grid gap-x-6 sm:grid-cols-2">
			{options.map((option) => (
				<label
					key={option.key}
					className={clsx(
						"flex cursor-pointer items-center gap-2.5",
						"text-sm text-text",
						"py-2",
						busy && "cursor-not-allowed opacity-60",
					)}
				>
					<input
						type="checkbox"
						checked={values[option.key] ?? option.default}
						disabled={busy}
						onChange={(event) => onChange(option.key, event.target.checked)}
						className="h-4 w-4 shrink-0 accent-accent"
					/>
					{option.label}
				</label>
			))}
		</div>
	);
}
