import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import type { ApiEnvironment, ApiVariable } from "../types";
import { EnvironmentTabs } from "./EnvironmentTabs";
import { VariableRow } from "./VariableRow";

interface EnvironmentModalProps {
	open: boolean;
	variables: ApiVariable[];
	environments: ApiEnvironment[];
	active: ApiEnvironment;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onDuplicate: () => void;
	onRemove: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onChange: (values: Record<string, string>) => void;
	onAddVariable: (name: string) => string;
	onDuplicateVariable: (key: string) => string | null;
	onKeepSecret: (key: string, secret: boolean) => void;
	onRenameVariable: (key: string, name: string) => void;
	onRemoveVariable: (key: string) => void;
	onClose: () => void;
}

export function EnvironmentModal(props: Readonly<EnvironmentModalProps>) {
	return (
		<BaseModal open={props.open} onClose={props.onClose}>
			{props.open ? <EnvironmentCard {...props} /> : null}
		</BaseModal>
	);
}

function EnvironmentCard({
	variables,
	environments,
	active,
	onSelect,
	onAdd,
	onDuplicate,
	onRemove,
	onRename,
	onChange,
	onAddVariable,
	onDuplicateVariable,
	onKeepSecret,
	onRenameVariable,
	onRemoveVariable,
	onClose,
}: Readonly<EnvironmentModalProps>) {
	const { t } = useTranslation();
	const [renamingKey, setRenamingKey] = useState<string | null>(null);

	return (
		<div
			className={clsx(
				"flex max-h-[85vh] w-[min(880px,94vw)] flex-col overflow-hidden",
				"rounded-2xl border border-border bg-bg shadow-2xl",
			)}
		>
			<header className="flex flex-col gap-3 border-b border-border px-6 py-4">
				<div className="flex items-center justify-between gap-3">
					<SectionTitle>{t(translation.ApiStudio.Environments)}</SectionTitle>
					<button
						type="button"
						onClick={onClose}
						aria-label={t(translation.ApiStudio.Close)}
						className="text-muted transition-colors hover:text-text"
					>
						<UiIcon name="xmark" className="h-4 w-4" />
					</button>
				</div>

				<EnvironmentTabs
					environments={environments}
					activeId={active.id}
					onSelect={onSelect}
					onAdd={onAdd}
					onDuplicate={onDuplicate}
					onRemove={onRemove}
				/>

				<label className="flex flex-col gap-1">
					<span className="sr-only">{t(translation.ApiStudio.EnvironmentName)}</span>
					<input
						value={active.name}
						spellCheck={false}
						placeholder={t(translation.ApiStudio.EnvironmentName)}
						onChange={(event) => onRename(active.id, event.target.value)}
						className={clsx(
							"h-9 w-full rounded-lg border border-border bg-bg/45 px-3",
							"text-xs font-semibold text-text outline-none focus:border-accent/50",
						)}
					/>
				</label>

				<p className="text-xs leading-5 text-muted">{t(translation.ApiStudio.StoredInProject)}</p>
			</header>

			<div className="flex min-h-0 flex-1 flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					{variables.length > 0 ? (
						<table className="w-full border-collapse">
							<thead className="sticky top-0 z-10 bg-bg">
								<tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted">
									<th className="w-[34%] border-r border-border px-3 py-2.5 text-left">
										{t(translation.ApiStudio.VariableName)}
									</th>
									<th className="px-3 py-2.5 text-left">{t(translation.ApiStudio.VariableValue)}</th>
									<th className="w-10 border-l border-border" />
								</tr>
							</thead>

							<tbody className="divide-y divide-border">
								{variables.map((variable) => (
									<VariableRow
										key={variable.key}
										variable={variable}
										value={active.values[variable.key] ?? ""}
										renaming={renamingKey === variable.key}
										onChange={(value) => onChange({ ...active.values, [variable.key]: value })}
										onRename={(name) => onRenameVariable(variable.key, name)}
										onRenamingChange={(renaming) => setRenamingKey(renaming ? variable.key : null)}
										onDuplicate={() => setRenamingKey(onDuplicateVariable(variable.key))}
										onKeepSecret={(secret) => onKeepSecret(variable.key, secret)}
										onRemove={variable.custom ? () => onRemoveVariable(variable.key) : null}
									/>
								))}
							</tbody>
						</table>
					) : (
						<p className="py-10 text-center text-xs text-muted">{t(translation.ApiStudio.NoVariables)}</p>
					)}

					<button
						type="button"
						onClick={() => setRenamingKey(onAddVariable(t(translation.ApiStudio.NewVariableName)))}
						className={clsx(
							"m-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2",
							"text-[11px] font-medium text-muted transition-colors",
							"hover:border-accent/40 hover:text-text",
						)}
					>
						<UiIcon name="plus" className="h-3.5 w-3.5" />
						{t(translation.ApiStudio.NewVariable)}
					</button>
				</div>
			</div>
		</div>
	);
}
