import type { PackageOption } from "@renderer/shared/types/lazify";

import { SelectedPackageCard } from "./SelectedPackageCard";
import { getFallbackPackageOption } from "./utils";

interface SelectedPackageListProps {
	packages: string[];
	packageDetails: Record<string, PackageOption>;
	busy: boolean;
	onRemove: (name: string) => void;
}

export function SelectedPackageList({
	packages,
	packageDetails,
	busy,
	onRemove,
}: Readonly<SelectedPackageListProps>) {
	if (packages.length === 0) return null;

	return (
		<div className="mt-3 grid gap-2">
			{packages.map((packageName) => {
				const pkg = packageDetails[packageName] ?? getFallbackPackageOption(packageName);

				return (
					<SelectedPackageCard
						key={packageName}
						pkg={pkg}
						busy={busy}
						onRemove={() => onRemove(packageName)}
					/>
				);
			})}
		</div>
	);
}
