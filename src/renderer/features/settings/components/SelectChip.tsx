import clsx from "clsx";
import { useState } from "react";

interface SelectChipOption {
	id: string;
	label: string;
}

interface SelectChipProps {
	options: ReadonlyArray<SelectChipOption>;
	value?: string;
	onChange?: (id: string) => void;
}

export function SelectChip({ options, value, onChange }: Readonly<SelectChipProps>) {
	const [internalValue, setInternalValue] = useState(options[0]?.id ?? "");

	const selected = value ?? internalValue;

	function handleSelect(id: string) {
		if (onChange) {
			onChange(id);
		} else {
			setInternalValue(id);
		}
	}

	return (
		<div className="flex items-center gap-1.5 rounded-[14px] border border-border bg-bg p-1">
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					onClick={() => handleSelect(option.id)}
					className={clsx(
						"rounded-[10px] px-3 py-1 text-xs font-semibold transition-all duration-100",
						selected === option.id ? "bg-accentSoft text-accent" : "text-muted hover:text-text",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
