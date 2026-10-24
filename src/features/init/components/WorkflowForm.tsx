import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { TemplateOption } from "@/shared/types/lazify";
import { SectionTitle, SmallText } from "@/shared/typography";
import { BackButton } from "@/shared/ui/BackButton";
import { fieldChromeClassName, TextInput } from "@/shared/ui/form/FormInput";
import DevIcon from "@/shared/ui/icons/DevIcon";
import UiIcon from "@/shared/ui/icons/UiIcon";

import { PackageSearchPicker } from "./PackageSearchPicker";
import { TemplateOptionsPanel } from "./TemplateOptionsPanel";

interface WorkflowFormProps {
	sourceMode: "stack" | "imported";
	sourceLabel: string;
	sourceIcon: string;
	projectName: string;
	projectDirectory: string;
	packageName: string;
	selectedTemplateId: string;
	templateOptions: TemplateOption[];
	busy: boolean;
	onProjectNameChange: (value: string) => void;
	onPackageNameChange: (value: string) => void;
	onBrowseDirectory: () => void;
	onContinue: () => void;
	createOptionValues: Record<string, boolean>;
	onCreateOptionChange: (key: string, value: boolean) => void;
	onBack: () => void;
	backLabel: string;
}

function FormSection({
	title,
	description,
	children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
	return (
		<section className="flex flex-col gap-4 p-5">
			<div>
				<h2 className="text-sm font-semibold text-text">{title}</h2>
				{description ? <SmallText className="mt-0.5">{description}</SmallText> : null}
			</div>
			{children}
		</section>
	);
}

export function WorkflowForm({
	sourceMode,
	sourceLabel,
	sourceIcon,
	projectName,
	projectDirectory,
	packageName,
	selectedTemplateId,
	templateOptions,
	busy,
	onProjectNameChange,
	onPackageNameChange,
	onBrowseDirectory,
	onContinue,
	createOptionValues,
	onCreateOptionChange,
	onBack,
	backLabel,
}: Readonly<WorkflowFormProps>) {
	const { t } = useTranslation();
	const createOptions = templateOptions.find((template) => template.id === selectedTemplateId)?.createOptions ?? [];
	const canContinue = Boolean(projectName.trim() && projectDirectory.trim()) && !busy;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<header className="flex flex-col gap-4">
				<BackButton label={backLabel} onClick={onBack} />
				<div className="flex items-center gap-3">
					<span
						className={clsx(
							"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
							"bg-soft",
							"border border-border",
							"text-2xl text-text",
						)}
					>
						<DevIcon name={sourceIcon} />
					</span>
					<SectionTitle className="min-w-0 truncate">{sourceLabel}</SectionTitle>
				</div>
			</header>

			<div className={clsx("rounded-2xl", "bg-soft", "border border-border", "divide-y divide-border")}>
				<FormSection title={t(translation.WorkflowForm.ProjectSection)}>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<label htmlFor="init-project-name" className="text-sm font-medium text-text">
								{t(translation.WorkflowForm.ProjectName)}
							</label>
							<TextInput
								id="init-project-name"
								size="md"
								value={projectName}
								onChange={(event) => onProjectNameChange(event.target.value)}
								placeholder={t(translation.WorkflowForm.ProjectNamePlaceholder)}
								autoComplete="off"
								spellCheck={false}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<label htmlFor="init-project-folder" className="text-sm font-medium text-text">
								{t(translation.WorkflowForm.WorkspaceDirectory)}
							</label>
							<div className="flex gap-2">
								<output
									id="init-project-folder"
									title={projectDirectory || undefined}
									className={clsx(
										"flex min-w-0 flex-1 items-center",
										fieldChromeClassName("default", "md"),
										projectDirectory ? "text-text" : "text-muted",
									)}
								>
									<span className="truncate">{projectDirectory || t(translation.WorkflowForm.NoFolder)}</span>
								</output>
								<button
									type="button"
									disabled={busy}
									onClick={onBrowseDirectory}
									className={clsx(
										"inline-flex h-10 shrink-0 items-center gap-2 rounded-xl",
										"bg-bg",
										"border border-border",
										"text-sm font-medium text-text",
										"px-3.5",
										"transition-colors hover:border-accent hover:text-accent",
										"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
										"disabled:cursor-not-allowed disabled:opacity-50",
									)}
								>
									<UiIcon name="folder" className="h-4 w-4" />
									{t(translation.GlobalTerm.Browse)}
								</button>
							</div>
						</div>
					</div>
				</FormSection>

				{sourceMode === "stack" ? (
					<FormSection
						title={t(translation.PackageSearch.NpmPackages)}
						description={t(translation.PackageSearch.NpmDesc)}
					>
						<PackageSearchPicker
							value={packageName}
							selectedTemplateId={selectedTemplateId}
							busy={busy}
							onChange={onPackageNameChange}
						/>
					</FormSection>
				) : null}

				{sourceMode === "stack" && createOptions.length > 0 ? (
					<FormSection
						title={t(translation.WorkflowForm.ScaffoldOptions)}
						description={t(translation.WorkflowForm.ScaffoldOptionsDesc)}
					>
						<TemplateOptionsPanel
							options={createOptions}
							values={createOptionValues}
							busy={busy}
							onChange={onCreateOptionChange}
						/>
					</FormSection>
				) : null}
			</div>

			<footer className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
				{canContinue ? null : <SmallText id="init-project-missing">{t(translation.WorkflowForm.EnterBoth)}</SmallText>}
				<button
					type="button"
					disabled={!canContinue}
					onClick={onContinue}
					aria-describedby={canContinue ? undefined : "init-project-missing"}
					className={clsx(
						"inline-flex h-10 items-center gap-2 rounded-xl",
						"bg-accent",
						"text-sm font-semibold text-white",
						"px-4",
						"transition-[background-color,transform] duration-150 hover:bg-accentHover active:scale-98",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
						"disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent disabled:active:scale-100",
						"motion-reduce:transition-none motion-reduce:active:scale-100",
					)}
				>
					{t(translation.WorkflowForm.CreateProject)}
					<UiIcon name="arrow-right" className="h-4 w-4" />
				</button>
			</footer>
		</div>
	);
}
