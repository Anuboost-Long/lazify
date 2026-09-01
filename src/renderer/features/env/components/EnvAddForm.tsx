import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import { IconButton } from "@renderer/shared/ui/IconButton";

import { EnvValueEditor } from "./EnvValueEditor";

interface EnvAddFormProps {
	/** Keys already in the file, so a duplicate is refused before it is written. */
	existingKeys: string[];
	busy: boolean;
	onAdd: (key: string, value: string) => Promise<boolean>;
	onCancel: () => void;
}

/** What every dotenv reader will accept as a name. */
const VALID_KEY = /^[A-Za-z_][A-Za-z0-9_.]*$/;

export function EnvAddForm({ existingKeys, busy, onAdd, onCancel }: Readonly<EnvAddFormProps>) {
	const { t } = useTranslation();

	const [key, setKey] = useState("");
	const [value, setValue] = useState("");

	const trimmed = key.trim();
	const duplicate = existingKeys.includes(trimmed);
	const malformed = trimmed !== "" && !VALID_KEY.test(trimmed);
	let problem: string | null = null;
	if (duplicate) problem = t(translation.EnvPane.DuplicateName, { name: trimmed });
	else if (malformed) problem = t(translation.EnvPane.InvalidName);

	const submit = async () => {
		if (trimmed === "" || problem) return;
		const added = await onAdd(trimmed, value);
		if (added) {
			setKey("");
			setValue("");
			onCancel();
		}
	};

	return (
		<div className="rounded-lg border border-border bg-text/[0.02] p-1.5">
			<TextInput
				size="sm"
				value={key}
				autoFocus
				spellCheck={false}
				aria-label={t(translation.EnvPane.Name)}
				placeholder={t(translation.EnvPane.NamePlaceholder)}
				inputClassName="font-mono text-xs"
				onChange={(event) => setKey(event.target.value.toUpperCase())}
				onKeyDown={(event) => {
					if (event.key === "Enter") void submit();
					if (event.key === "Escape") onCancel();
				}}
			/>
			<div className="mt-1">
				<EnvValueEditor
					value={value}
					onChange={setValue}
					onCommit={() => void submit()}
					onCancel={onCancel}
				/>
			</div>

			{problem ? (
				<CaptionText className="mt-1 block !text-rose-600 dark:!text-rose-400">{problem}</CaptionText>
			) : null}

			<div className="mt-1 flex items-center justify-end gap-1">
				<IconButton
					icon="xmark"
					title={t(translation.GlobalTerm.Cancel)}
					aria-label={t(translation.GlobalTerm.Cancel)}
					onClick={onCancel}
				/>
				<IconButton
					icon="check-circle"
					title={t(translation.GlobalTerm.Add)}
					aria-label={t(translation.GlobalTerm.Add)}
					disabled={trimmed === "" || problem !== null || busy}
					onClick={() => void submit()}
					className="text-accent"
				/>
			</div>
		</div>
	);
}
