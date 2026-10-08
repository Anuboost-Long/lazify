import clsx from "clsx";

import type { ImportState } from "@/features/migration/hooks/useElectronImport";
import type { ElectronImportResult, ImportOffer, ProjectLink } from "@/shared/lib/migration/electron-import";

interface ImportPageProps {
	state: ImportState;
	granted: string[];
	onImport: () => void;
	onNotNow: () => void;
	onChooseProjectFolders: () => void;
	onContinue: () => void;
}

const primaryButton = clsx(
	"inline-flex h-9 items-center rounded-md",
	"bg-chain-lime",
	"text-sm font-medium text-chain-navy",
	"px-4",
	"hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chain-navy dark:focus-visible:outline-chain-cream disabled:opacity-60",
);

const secondaryButton = clsx(
	"inline-flex h-9 items-center rounded-md",
	"border border-chain-navy/15 dark:border-chain-cream/15",
	"text-sm font-medium",
	"px-4",
	"hover:bg-chain-navy/5 dark:hover:bg-chain-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chain-navy dark:focus-visible:outline-chain-cream",
);

const muted = "text-chain-navy/60 dark:text-chain-cream/60";

function Summary({ offer }: Readonly<{ offer: ImportOffer }>) {
	const { database, jsonStores, folders } = offer.report;
	const customAgents = jsonStores.find((store) => store.name === "custom-agents.json");
	const templates = folders.find((folder) => folder.name === "imported-templates");
	const rows: Array<[string, string]> = [
		["Projects", String(offer.projects.length)],
		["Prompt presets", String(database.rowCounts.prompt_presets ?? 0)],
		["Context entries", String(database.rowCounts.context_entries ?? 0)],
		["Tasks", String(database.rowCounts.tasks ?? 0)],
		["Custom agents", String(customAgents?.records ?? 0)],
		["Imported templates", templates?.present ? "Included" : "None"],
	];

	return (
		<dl className="divide-y divide-chain-navy/10 border-y border-chain-navy/10 dark:divide-chain-cream/10 dark:border-chain-cream/10">
			{rows.map(([label, value]) => (
				<div key={label} className="flex items-center justify-between py-2.5 text-sm">
					<dt className={muted}>{label}</dt>
					<dd className="font-medium tabular-nums">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function Warnings({ warnings }: Readonly<{ warnings: string[] }>) {
	if (warnings.length === 0) return null;

	return (
		<ul className={clsx("list-disc text-sm", muted, "space-y-1 pl-5")}>
			{warnings.map((warning) => (
				<li key={warning}>{warning}</li>
			))}
		</ul>
	);
}

function projectStatus(project: ProjectLink, granted: string[]) {
	if (granted.some((folder) => project.path === folder || project.path.startsWith(`${folder}/`))) {
		return { label: "Access allowed", emphasis: false };
	}
	if (!project.exists) return { label: "Not found at this path", emphasis: true };

	return { label: "Needs access", emphasis: false };
}

function Projects({
	result,
	granted,
	onChooseProjectFolders,
}: Readonly<{ result: ElectronImportResult; granted: string[]; onChooseProjectFolders: () => void }>) {
	if (result.projects.length === 0) return null;

	const needsAccess = result.projects.some(
		(project) => project.exists && projectStatus(project, granted).label === "Needs access",
	);

	return (
		<section className="space-y-3">
			<div className="space-y-1">
				<h2 className="text-base font-semibold">Your projects</h2>
				<p className={clsx("text-sm", muted)}>
					Lazify can only open folders you allow. Choose your project folders once; you can select several at a time.
				</p>
			</div>
			<ul className="divide-y divide-chain-navy/10 border-y border-chain-navy/10 dark:divide-chain-cream/10 dark:border-chain-cream/10">
				{result.projects.map((project) => {
					const status = projectStatus(project, granted);

					return (
						<li key={project.path} className="flex items-center justify-between gap-4 py-2.5">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">{project.name}</p>
								<p className={clsx("truncate text-xs", muted)}>{project.path}</p>
							</div>
							<span className={clsx("shrink-0 text-xs", status.emphasis ? "font-medium" : muted)}>{status.label}</span>
						</li>
					);
				})}
			</ul>
			{needsAccess && (
				<button type="button" className={secondaryButton} onClick={onChooseProjectFolders}>
					Choose project folders
				</button>
			)}
		</section>
	);
}

function importLabel(kind: ImportState["kind"]) {
	if (kind === "importing") return "Importing…";
	if (kind === "error") return "Try again";

	return "Import";
}

export default function ImportPage({
	state,
	granted,
	onImport,
	onNotNow,
	onChooseProjectFolders,
	onContinue,
}: Readonly<ImportPageProps>) {
	switch (state.kind) {
		case "checking":
			return <main className={clsx("mx-auto max-w-xl text-sm", muted, "px-4 py-12")}>Looking for your Lazify data…</main>;
		case "none":
			return (
				<main className="mx-auto max-w-xl space-y-4 px-4 py-12">
					<h1 className="text-xl font-semibold">No Lazify data to import</h1>
					<p className={clsx("text-sm", muted)}>There's nothing from the Lazify desktop app on this Mac.</p>
					<button type="button" className={primaryButton} onClick={onContinue}>
						Continue
					</button>
				</main>
			);
		case "offer":
		case "importing":
		case "error": {
			const importing = state.kind === "importing";

			return (
				<main className="mx-auto max-w-xl space-y-6 px-4 py-12">
					<div className="space-y-2">
						<h1 className="text-xl font-semibold">Import your Lazify data</h1>
						<p className={clsx("text-sm", muted)}>
							We found data from the Lazify desktop app. Importing copies it here after saving a backup. The desktop app's
							data isn't changed, so you can keep using it.
						</p>
					</div>
					<Summary offer={state.offer} />
					<Warnings warnings={state.offer.report.warnings} />
					{state.kind === "error" && (
						<p role="alert" className="text-sm font-medium">
							Couldn't import: {state.message}. Nothing in the desktop app was changed. Try again, or continue without
							importing.
						</p>
					)}
					<div className="flex flex-wrap gap-3">
						<button type="button" className={primaryButton} onClick={onImport} disabled={importing}>
							{importLabel(state.kind)}
						</button>
						<button type="button" className={secondaryButton} onClick={onNotNow} disabled={importing}>
							Not now
						</button>
					</div>
				</main>
			);
		}
		case "done":
			return (
				<main className="mx-auto max-w-xl space-y-8 px-4 py-12">
					<div className="space-y-2">
						<h1 className="text-xl font-semibold">Imported</h1>
						<p className={clsx("text-sm", muted)}>
							Your Lazify data is here. A backup was saved before importing, at{" "}
							<span className="break-all font-mono text-xs">{state.result.backupFolder}</span>.
						</p>
					</div>
					<Projects result={state.result} granted={granted} onChooseProjectFolders={onChooseProjectFolders} />
					<button type="button" className={primaryButton} onClick={onContinue}>
						Continue
					</button>
				</main>
			);
	}
}
