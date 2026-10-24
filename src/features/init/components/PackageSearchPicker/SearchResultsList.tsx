import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { PackageOption } from "@/shared/types/lazify";
import { SmallText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface SearchResultsListProps {
	query: string;
	loading: boolean;
	error: string;
	results: PackageOption[];
	selectedPackages: string[];
	busy: boolean;
	onAdd: (pkg: PackageOption) => void;
}

export function SearchResultsList({
	query,
	loading,
	error,
	results,
	selectedPackages,
	busy,
	onAdd,
}: Readonly<SearchResultsListProps>) {
	const { t } = useTranslation();
	const trimmedQuery = query.trim();

	if (trimmedQuery.length === 0) return null;
	if (trimmedQuery.length < 2) return <SmallText>{t(translation.PackageSearch.MinChars)}</SmallText>;
	if (loading) {
		return (
			<SmallText className="flex items-center gap-2" aria-live="polite">
				<UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
				{t(translation.PackageSearch.Searching)}
			</SmallText>
		);
	}
	if (error) return <SmallText tone="error">{error}</SmallText>;
	if (results.length === 0) return <SmallText>{t(translation.PackageSearch.NoResults)}</SmallText>;

	return (
		<ul
			className={clsx("max-h-80 overflow-y-auto rounded-xl", "bg-bg", "border border-border", "divide-y divide-border")}
		>
			{results.map((pkg) => {
				const added = selectedPackages.includes(pkg.name);

				return (
					<li key={pkg.name}>
						<button
							type="button"
							onClick={() => onAdd(pkg)}
							disabled={busy || added}
							className={clsx(
								"group flex w-full items-center gap-3",
								"text-left",
								"px-3.5 py-2.5",
								"transition-colors duration-150 enabled:hover:bg-text/4",
								"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
								"disabled:cursor-default",
							)}
						>
							<span className="min-w-0 flex-1">
								<span className="flex items-baseline gap-2">
									<span className="truncate text-sm font-medium text-text">{pkg.name}</span>
									<span className="shrink-0 font-mono text-xs text-muted">{pkg.version}</span>
								</span>
								<span className="mt-0.5 block truncate text-xs text-muted">
									{pkg.description || t(translation.PackageSearch.NoDescription)}
								</span>
							</span>
							<span
								className={clsx(
									"shrink-0 text-xs font-medium",
									added ? "text-muted" : "text-accent group-hover:underline",
								)}
							>
								{added ? t(translation.GlobalTerm.Selected) : t(translation.GlobalTerm.Add)}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
