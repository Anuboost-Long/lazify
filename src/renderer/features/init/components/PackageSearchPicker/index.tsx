import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PackageOption } from "@renderer/shared/types/lazify";
import { BodyText, OverlineText, PillText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";

import { SearchResultsList } from "./SearchResultsList";
import { SelectedPackageList } from "./SelectedPackageList";
import { TemplatePackagesPanel } from "./TemplatePackagesPanel";
import type { PackageSearchPickerProps, TemplatePackagePreview } from "./types";
import {
	getFallbackPackageOption,
	parsePackageNames,
	resolveTemplatePackagePreviews,
} from "./utils";

export function PackageSearchPicker({
	value,
	selectedTemplateId,
	busy,
	onChange,
}: Readonly<PackageSearchPickerProps>) {
	const { t } = useTranslation();
	const selectedPackages = useMemo(() => parsePackageNames(value), [value]);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<PackageOption[]>([]);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [selectedPackageDetails, setSelectedPackageDetails] = useState<
		Record<string, PackageOption>
	>({});
	const [templatePackages, setTemplatePackages] = useState<TemplatePackagePreview[]>([]);
	const [templatePackagesLoading, setTemplatePackagesLoading] = useState(false);
	const [templatePackagesError, setTemplatePackagesError] = useState("");

	useEffect(() => {
		setSelectedPackageDetails((current) => {
			const nextEntries = selectedPackages.map((packageName) => [
				packageName,
				current[packageName] ?? getFallbackPackageOption(packageName),
			]);

			return Object.fromEntries(nextEntries);
		});
	}, [selectedPackages]);

	useEffect(() => {
		const normalizedQuery = query.trim();

		if (normalizedQuery.length < 2) {
			setResults([]);
			setLoading(false);
			setErrorMessage("");
			return;
		}

		let cancelled = false;
		const timeoutId = globalThis.setTimeout(async () => {
			setLoading(true);
			setErrorMessage("");

			try {
				const packages = await globalThis.lazify.searchNpmPackages(normalizedQuery);

				if (!cancelled) {
					setResults(packages);
					setSelectedPackageDetails((current) => {
						const next = { ...current };

						for (const pkg of packages) {
							if (selectedPackages.includes(pkg.name)) {
								next[pkg.name] = pkg;
							}
						}

						return next;
					});
				}
			} catch (error) {
				if (!cancelled) {
					setResults([]);
					setErrorMessage(
						error instanceof Error ? error.message : t(translation.PackageSearch.NpmError),
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 220);

		return () => {
			cancelled = true;
			globalThis.clearTimeout(timeoutId);
		};
	}, [query]);

	useEffect(() => {
		if (!selectedTemplateId.trim()) {
			setTemplatePackages([]);
			setTemplatePackagesError("");
			setTemplatePackagesLoading(false);
			return;
		}

		let cancelled = false;

		const loadTemplatePackages = async () => {
			setTemplatePackagesLoading(true);
			setTemplatePackagesError("");

			try {
				const manifestPackages = await globalThis.lazify.getTemplatePackageManifest(selectedTemplateId);
				const previews = await resolveTemplatePackagePreviews(manifestPackages);

				if (!cancelled) setTemplatePackages(previews);
			} catch (error) {
				if (!cancelled) {
					setTemplatePackages([]);
					setTemplatePackagesError(
						error instanceof Error ? error.message : t(translation.PackageSearch.TemplateError),
					);
				}
			} finally {
				if (!cancelled) setTemplatePackagesLoading(false);
			}
		};

		void loadTemplatePackages();

		return () => {
			cancelled = true;
		};
	}, [selectedTemplateId]);

	const addPackage = (pkg: PackageOption) => {
		if (selectedPackages.includes(pkg.name)) {
			setQuery("");
			return;
		}

		setSelectedPackageDetails((current) => ({ ...current, [pkg.name]: pkg }));
		onChange([...selectedPackages, pkg.name].join(", "));
		setQuery("");
		setResults([]);
		setErrorMessage("");
	};

	const removePackage = (packageName: string) => {
		onChange(selectedPackages.filter((item) => item !== packageName).join(", "));
	};

	return (
		<div className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<OverlineText className="text-accent">{t(translation.PackageSearch.NpmPackages)}</OverlineText>
					<BodyText className="mt-2 text-muted">{t(translation.PackageSearch.NpmDesc)}</BodyText>
				</div>
				<PillText className="rounded-full border border-border bg-soft px-3 py-2 text-muted">
					{t(translation.PackageSearch.SelectedCount, {
						count: selectedPackages.length,
					})}
				</PillText>
			</div>

			<div className="mt-4 ">
				<TemplatePackagesPanel
					loading={templatePackagesLoading}
					error={templatePackagesError}
					packages={templatePackages}
				/>

				<TextInput
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t(translation.PackageSearch.SearchPlaceholder)}
					icon="search"
					className="mt-4"
				/>

				<SelectedPackageList
					packages={selectedPackages}
					packageDetails={selectedPackageDetails}
					busy={busy}
					onRemove={removePackage}
				/>

				<SearchResultsList
					query={query}
					loading={loading}
					error={errorMessage}
					results={results}
					selectedPackages={selectedPackages}
					busy={busy}
					onAdd={addPackage}
				/>
			</div>
		</div>
	);
}
