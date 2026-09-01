import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { ContextMenu } from "@renderer/shared/ui/ContextMenu";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import type { ApiVariable } from "../types";
import { InlineRename } from "./InlineRename";

interface VariableRowProps {
	variable: ApiVariable;
	value: string;
	renaming: boolean;
	onChange: (value: string) => void;
	onRename: (name: string) => void;
	onRenamingChange: (renaming: boolean) => void;
	onDuplicate: () => void;
	onKeepSecret: (secret: boolean) => void;
	onRemove: (() => void) | null;
}

interface VariableNameProps {
	variable: ApiVariable;
	renaming: boolean;
	onRename: (name: string) => void;
	onRenamingChange: (renaming: boolean) => void;
}

function VariableName({
	variable,
	renaming,
	onRename,
	onRenamingChange,
}: Readonly<VariableNameProps>) {
	const { t } = useTranslation();

	if (renaming) {
		return (
			<InlineRename
				value={variable.name}
				label={t(translation.ApiStudio.VariableName)}
				onCommit={(name) => {
					onRename(name);
					onRenamingChange(false);
				}}
				onCancel={() => onRenamingChange(false)}
			/>
		);
	}

	return (
		<>
			<button
				type="button"
				onDoubleClick={() => onRenamingChange(true)}
				onClick={() => onRenamingChange(true)}
				title={t(translation.ApiStudio.RenameVariable)}
				className={clsx(
					"min-w-0 truncate text-left font-mono text-xs font-semibold text-text",
					"transition-colors hover:text-accent",
				)}
			>
				{variable.name}
			</button>

			{variable.parameterName ? (
				<span
					title={`${variable.location} · ${variable.parameterName}`}
					className="shrink-0 rounded bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted"
				>
					{variable.location}
				</span>
			) : null}
		</>
	);
}

interface VariableValueProps {
	variable: ApiVariable;
	value: string;
	/** No value and no default: the request would go out with a blank in it. */
	missing: boolean;
	onChange: (value: string) => void;
}

function VariableValue({ variable, value, missing, onChange }: Readonly<VariableValueProps>) {
	const { t } = useTranslation();
	const [revealed, setRevealed] = useState(false);

	return (
		<span className="relative flex min-w-0 items-center">
			<input
				type={variable.secret && !revealed ? "password" : "text"}
				value={value}
				aria-label={variable.name}
				spellCheck={false}
				autoComplete="off"
				placeholder={variable.defaultValue ?? t(translation.ApiStudio.VariableValue)}
				onChange={(event) => onChange(event.target.value)}
				className={clsx(
					"h-9 w-full rounded-lg border bg-transparent pl-2.5 font-mono text-xs text-text",
					"outline-none placeholder:text-muted/60 focus:border-accent/50 focus:bg-bg/45",
					variable.secret ? "pr-8" : "pr-2.5",
					missing && !variable.custom ? "border-warning/40" : "border-transparent hover:border-border",
				)}
			/>

			{variable.secret ? (
				<button
					type="button"
					onClick={() => setRevealed((shown) => !shown)}
					aria-pressed={revealed}
					aria-label={`${t(revealed ? translation.ApiStudio.HideValue : translation.ApiStudio.ShowValue)} ${variable.name}`}
					className={clsx(
						"absolute right-1.5 flex h-5 w-5 items-center justify-center rounded",
						"text-muted transition-colors hover:bg-text/[0.06] hover:text-text",
					)}
				>
					<UiIcon name={revealed ? "eye-off" : "eye"} className="h-3.5 w-3.5" />
				</button>
			) : null}
		</span>
	);
}

export function VariableRow({
	variable,
	value,
	renaming,
	onChange,
	onRename,
	onRenamingChange,
	onDuplicate,
	onKeepSecret,
	onRemove,
}: Readonly<VariableRowProps>) {
	const { t } = useTranslation();
	const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
	const missing = !value.trim() && !variable.defaultValue;

	return (
		<tr
			onContextMenu={(event) => {
				event.preventDefault();
				setMenuAt({ x: event.clientX, y: event.clientY });
			}}
			className="group/variable transition-colors hover:bg-text/[0.02]"
		>
			<td className="w-[34%] border-r border-border px-3 py-1.5 align-middle">
				<div className="flex min-w-0 items-center gap-2">
					<VariableName
						variable={variable}
						renaming={renaming}
						onRename={onRename}
						onRenamingChange={onRenamingChange}
					/>
				</div>
			</td>

			<td className="px-2 py-1.5 align-middle">
				<VariableValue variable={variable} value={value} missing={missing} onChange={onChange} />
			</td>

			<td className="w-10 border-l border-border px-1 py-1.5 text-center align-middle">
				<button
					type="button"
					onClick={(event) =>
						setMenuAt({ x: event.currentTarget.getBoundingClientRect().left, y: event.clientY })
					}
					aria-label={`${t(translation.ApiStudio.VariableOptions)} ${variable.name}`}
					className={clsx(
						"mx-auto flex h-6 w-6 items-center justify-center rounded-md text-muted",
						"opacity-0 transition-opacity group-hover/variable:opacity-100 focus:opacity-100",
						"hover:bg-text/[0.06] hover:text-text",
					)}
				>
					<UiIcon name="more" className="h-3.5 w-3.5" />
				</button>
			</td>

			<td className="w-0 p-0">
				<ContextMenu
					position={menuAt}
					onClose={() => setMenuAt(null)}
					items={[
						{
							key: "rename",
							label: t(translation.ApiStudio.RenameVariable),
							onSelect: () => onRenamingChange(true),
						},
						{
							key: "duplicate",
							label: t(translation.ApiStudio.DuplicateVariable),
							onSelect: onDuplicate,
						},
						{
							key: "secret",
							label: t(
								variable.secret
									? translation.ApiStudio.StopKeepingSecret
									: translation.ApiStudio.KeepSecret,
							),
							onSelect: () => onKeepSecret(!variable.secret),
						},
						...(onRemove
							? [
									{
										key: "remove",
										label: t(translation.ApiStudio.RemoveVariable),
										destructive: true,
										onSelect: onRemove,
									},
								]
							: []),
					]}
				/>
			</td>
		</tr>
	);
}
