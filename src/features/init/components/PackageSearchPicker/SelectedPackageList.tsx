import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { PackageOption } from "@/shared/types/lazify";
import UiIcon from "@/shared/ui/icons/UiIcon";

import { getFallbackPackageOption } from "./utils";

interface SelectedPackageListProps {
	packages: string[];
	packageDetails: Record<string, PackageOption>;
	busy: boolean;
	onRemove: (name: string) => void;
}

export function SelectedPackageList({ packages, packageDetails, busy, onRemove }: Readonly<SelectedPackageListProps>) {
	const { t } = useTranslation();

	if (packages.length === 0) return null;

	return (
		<ul className="flex flex-wrap gap-1.5">
			{packages.map((packageName) => {
				const pkg = packageDetails[packageName] ?? getFallbackPackageOption(packageName);

				return (
					<li
						key={packageName}
						title={pkg.description || undefined}
						className={clsx(
							"inline-flex h-7 items-center gap-1 rounded-lg",
							"bg-accentSoft",
							"border border-accent/30",
							"text-xs font-medium text-text",
							"pl-2.5 pr-1",
						)}
					>
						{packageName}
						<button
							type="button"
							disabled={busy}
							onClick={() => onRemove(packageName)}
							aria-label={t(translation.PackageSearch.RemovePackage, { name: packageName })}
							className={clsx(
								"flex h-5 w-5 items-center justify-center rounded-md",
								"text-muted",
								"transition-colors hover:bg-text/10 hover:text-text",
								"focus-visible:outline-2 focus-visible:outline-accent",
								"disabled:opacity-50",
							)}
						>
							<UiIcon name="xmark" className="h-3.5 w-3.5" />
						</button>
					</li>
				);
			})}
		</ul>
	);
}
