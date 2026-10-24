import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { SmallText } from "@/shared/typography";

import type { TemplatePackagePreview } from "./types";

interface TemplatePackagesPanelProps {
	loading: boolean;
	error: string;
	packages: TemplatePackagePreview[];
}

const chip = clsx(
	"inline-flex h-7 items-center gap-1.5 rounded-lg",
	"bg-bg",
	"border border-border",
	"text-xs font-medium text-text",
	"px-2.5",
);

/** What the template installs on its own, shown so the search below isn't used to add it twice. */
export function TemplatePackagesPanel({ loading, error, packages }: Readonly<TemplatePackagesPanelProps>) {
	const { t } = useTranslation();

	const body = () => {
		if (loading) {
			return (
				<div className="flex flex-wrap gap-1.5">
					<span className="sr-only">{t(translation.PackageSearch.QueryingNpm)}</span>
					{[72, 96, 64].map((width) => (
						<span
							key={width}
							aria-hidden
							style={{ width }}
							className={clsx("h-7 rounded-lg", "bg-text/6", "animate-pulse motion-reduce:animate-none")}
						/>
					))}
				</div>
			);
		}
		if (error) return <SmallText tone="error">{error}</SmallText>;
		if (packages.length === 0) return <SmallText>{t(translation.PackageSearch.NoTemplateEntries)}</SmallText>;

		return (
			<ul className="flex flex-wrap gap-1.5">
				{packages.map((pkg) => (
					<li key={pkg.name} title={pkg.description || undefined} className={chip}>
						{pkg.name}
						<span className="font-mono text-muted">{pkg.version || pkg.requestedVersion}</span>
					</li>
				))}
			</ul>
		);
	};

	return (
		<div className="flex flex-col gap-2">
			<SmallText tone="text" className="font-medium">
				{t(translation.PackageSearch.TemplatePackages)}
			</SmallText>
			{body()}
		</div>
	);
}
