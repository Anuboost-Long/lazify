import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { InstalledPackage } from "@renderer/shared/types/lazify";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";

import type { NpmPackageSearchResult } from "../../../../main/scaffolding/npm-registry";
import { PackageRow } from "./dependency/PackageRow";
import { SearchResultRow } from "./dependency/SearchResultRow";

type Tab = "all" | "dep" | "dev";

interface DependencyPaneProps {
	projectPath: string;
}

// ─── Package row ─────────────────────────────────────────────────────────────

export function DependencyPane({ projectPath }: DependencyPaneProps) {
	const { t } = useTranslation();

	const [packages, setPackages] = useState<InstalledPackage[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [filter, setFilter] = useState("");
	const [tab, setTab] = useState<Tab>("all");

	const [showAddPanel, setShowAddPanel] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<NpmPackageSearchResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);

	const [actionPkg, setActionPkg] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const searchInputRef = useRef<HTMLInputElement>(null);

	const loadPackages = async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const result = await globalThis.lazify.listProjectPackages(projectPath);
			setPackages(result);
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : t(translation.DependencyPane.LoadError));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadPackages();
	}, [projectPath]);

	useEffect(() => {
		const normalizedQuery = searchQuery.trim();
		if (normalizedQuery.length < 2) {
			setSearchResults([]);
			setSearching(false);
			setSearchError(null);
			return;
		}

		let cancelled = false;
		const timeoutId = globalThis.setTimeout(async () => {
			setSearching(true);
			setSearchError(null);
			try {
				const results = await globalThis.lazify.searchNpmPackages(normalizedQuery);
				if (!cancelled) setSearchResults(results);
			} catch (err) {
				if (!cancelled) {
					setSearchResults([]);
					setSearchError(err instanceof Error ? err.message : "npm search failed.");
				}
			} finally {
				if (!cancelled) setSearching(false);
			}
		}, 220);

		return () => {
			cancelled = true;
			globalThis.clearTimeout(timeoutId);
		};
	}, [searchQuery]);

	useEffect(() => {
		if (showAddPanel) {
			globalThis.setTimeout(() => searchInputRef.current?.focus(), 50);
		}
	}, [showAddPanel]);

	const handleInstall = async (packageName: string, dev: boolean) => {
		setActionPkg(packageName);
		setActionError(null);
		try {
			const result = await globalThis.lazify.addProjectPackage({ projectPath, packageName, dev });
			if (!result.success) {
				setActionError(t(translation.DependencyPane.InstallError, { name: packageName }));
			} else {
				setSearchQuery("");
				setSearchResults([]);
				setShowAddPanel(false);
				await loadPackages();
			}
		} catch {
			setActionError(t(translation.DependencyPane.InstallError, { name: packageName }));
		} finally {
			setActionPkg(null);
		}
	};

	const handleRemove = async (packageName: string) => {
		setActionPkg(packageName);
		setActionError(null);
		try {
			const result = await globalThis.lazify.removeProjectPackage({ projectPath, packageName });
			if (!result.success) {
				setActionError(t(translation.DependencyPane.RemoveError, { name: packageName }));
			} else {
				await loadPackages();
			}
		} catch {
			setActionError(t(translation.DependencyPane.RemoveError, { name: packageName }));
		} finally {
			setActionPkg(null);
		}
	};

	const toggleAddPanel = () => {
		setShowAddPanel((v) => !v);
		setSearchQuery("");
		setSearchResults([]);
		setActionError(null);
	};

	const depCount = packages.filter((p) => !p.isDev).length;
	const devCount = packages.filter((p) => p.isDev).length;

	const filteredPackages = packages.filter((pkg) => {
		const matchesTab = tab === "all" || (tab === "dep" && !pkg.isDev) || (tab === "dev" && pkg.isDev);
		const matchesFilter = pkg.name.toLowerCase().includes(filter.toLowerCase());
		return matchesTab && matchesFilter;
	});

	const tabs: { key: Tab; label: string; count: number }[] = [
		{ key: "all", label: t(translation.DependencyPane.TabAll), count: packages.length },
		{ key: "dep", label: t(translation.DependencyPane.TabDeps), count: depCount },
		{ key: "dev", label: t(translation.DependencyPane.TabDev), count: devCount },
	];

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-center justify-end gap-2 border-b border-border bg-soft px-4 py-2">
				<div className="flex items-center gap-2">
					{!loading && packages.length > 0 && (
						<PillText
							as="span"
							className="rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] text-muted"
						>
							{t(translation.DependencyPane.PackagesCount, { count: packages.length })}
						</PillText>
					)}
					<LabelButton
						label={translation.DependencyPane.AddPackage}
						icon={showAddPanel ? "xmark" : "plus"}
						variant={showAddPanel ? "accent" : "default"}
						disabled={loading || !!actionPkg}
						onClick={toggleAddPanel}
					/>
					<LabelButton
						label={loading ? translation.GlobalTerm.Scanning : translation.GlobalTerm.Refresh}
						loading={loading}
						disabled={loading || !!actionPkg}
						onClick={() => void loadPackages()}
					/>
				</div>
			</div>

			<div className="space-y-4 p-4">
				{/* ── Error banner ── */}
				{actionError && (
					<div className="flex items-center justify-between gap-3 rounded-2xl border border-red-300/40 bg-red-50/60 px-4 py-2.5 text-sm dark:border-red-400/20 dark:bg-red-950/30">
						<BodyText className="text-red-700 dark:text-red-400">{actionError}</BodyText>
						<IconButton
							icon="xmark"
							iconClassName="h-4 w-4"
							onClick={() => setActionError(null)}
							className="shrink-0 text-red-400 hover:text-red-600"
						/>
					</div>
				)}

				{/* ── Loading ── */}
				{loading && (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
						<UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
						{t(translation.DependencyPane.Loading)}
					</div>
				)}

				{/* ── Load error ── */}
				{!loading && loadError && (
					<div className="rounded-2xl border border-border bg-soft/40 px-4 py-3 text-sm text-muted">
						{loadError}
					</div>
				)}

				{/* ── Add Package panel ── */}
				{showAddPanel && !loading && (
					<div className="rounded-[20px] border border-accent/20 bg-accent/[0.03] p-4">
						<OverlineText className="mb-3 text-accent">
							{t(translation.DependencyPane.AddPanelTitle)}
						</OverlineText>

						{/* Search input */}
						<div className="relative">
							<UiIcon
								name="search"
								className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
							/>
							<input
								ref={searchInputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={t(translation.DependencyPane.AddPanelSearch)}
								className="w-full rounded-[14px] border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
							/>
						</div>

						{/* Results area */}
						<div className="mt-3">
							{searchQuery.trim().length < 2 && (
								<div className="rounded-[14px] border border-dashed border-border/60 px-4 py-4 text-center text-sm text-muted">
									{t(translation.DependencyPane.AddPanelMinChars)}
								</div>
							)}

							{searching && (
								<div className="flex items-center gap-2 rounded-[14px] border border-dashed border-border/60 px-4 py-4 text-sm text-muted">
									<UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
									{t(translation.DependencyPane.AddPanelSearching)}
								</div>
							)}

							{!searching && searchError && (
								<div className="rounded-[14px] border border-dashed border-border/60 px-4 py-4 text-sm text-muted">
									{searchError}
								</div>
							)}

							{!searching &&
								!searchError &&
								searchQuery.trim().length >= 2 &&
								searchResults.length === 0 && (
									<div className="rounded-[14px] border border-dashed border-border/60 px-4 py-4 text-center text-sm text-muted">
										{t(translation.DependencyPane.AddPanelNoResults)}
									</div>
								)}

							{!searching && searchResults.length > 0 && (
								<div className="grid gap-2">
									{searchResults.map((pkg) => (
										<SearchResultRow
											key={pkg.name}
											pkg={pkg}
											isInstalled={packages.some((p) => p.name === pkg.name)}
											isActioning={actionPkg === pkg.name}
											anyActioning={!!actionPkg}
											onInstall={(dev) => void handleInstall(pkg.name, dev)}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{/* ── Installed packages list ── */}
				{!loading && !loadError && packages.length > 0 && (
					<>
						{/* Filter + tabs row */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="relative max-w-xs flex-1">
								<UiIcon
									name="search"
									className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
								/>
								<input
									type="text"
									value={filter}
									onChange={(e) => setFilter(e.target.value)}
									placeholder={t(translation.DependencyPane.SearchInstalled)}
									className="w-full rounded-full border border-border bg-soft py-1.5 pl-8 pr-3 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-0.5 rounded-full border border-border bg-soft p-0.5">
								{tabs.map((tabOption) => (
									<button
										key={tabOption.key}
										type="button"
										onClick={() => setTab(tabOption.key)}
										className={clsx(
											"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
											tab === tabOption.key ? "bg-bg text-text shadow-sm" : "text-muted hover:text-text",
										)}
									>
										{tabOption.label}
										<span
											className={clsx(
												"min-w-[1.2rem] rounded-full px-1 py-0.5 text-center text-[9px]",
												tab === tabOption.key ? "bg-accent/12 text-accent" : "bg-bg/60 text-muted/70",
											)}
										>
											{tabOption.count}
										</span>
									</button>
								))}
							</div>
						</div>

						{/* Package rows */}
						{filteredPackages.length === 0 ? (
							<div className="flex items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-8 text-sm text-muted">
								{t(translation.DependencyPane.Empty)}
							</div>
						) : (
							<div className="grid gap-1.5">
								{filteredPackages.map((pkg) => (
									<PackageRow
										key={pkg.name}
										pkg={pkg}
										removing={actionPkg === pkg.name}
										disabled={!!actionPkg}
										onRemove={() => void handleRemove(pkg.name)}
									/>
								))}
							</div>
						)}
					</>
				)}

				{/* ── Empty state ── */}
				{!loading && !loadError && packages.length === 0 && (
					<div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-12 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-soft text-muted">
							<UiIcon name="package" className="h-6 w-6" />
						</div>
						<CardTitle className="mt-4 text-base">{t(translation.DependencyPane.Empty)}</CardTitle>
					</div>
				)}
			</div>
		</div>
	);
}
