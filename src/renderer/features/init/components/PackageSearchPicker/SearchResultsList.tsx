import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import type { PackageOption } from "@renderer/shared/types/lazify";
import { SearchResultCard } from "./SearchResultCard";

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
  onAdd
}: SearchResultsListProps) {
  const { t } = useTranslation();
  const trimmedQuery = query.trim();

  return (
    <div className="mt-3 min-h-[3rem] rounded-[20px] border border-dashed border-border bg-bg p-2">
      {trimmedQuery.length < 2 ? (
        <div className="flex min-h-[2rem] items-center px-3 text-sm text-muted">
          {t(translation.PackageSearch.MinChars)}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[2rem] items-center gap-2 px-3 text-sm text-muted">
          <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
          {t(translation.PackageSearch.Searching)}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="flex min-h-[2rem] items-center px-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {!loading && !error && trimmedQuery.length >= 2 && results.length === 0 ? (
        <div className="flex min-h-[2rem] items-center px-3 text-sm text-muted">
          {t(translation.PackageSearch.NoResults)}
        </div>
      ) : null}

      {!loading && !error && results.length > 0 ? (
        <div className="grid gap-2">
          {results.map((pkg) => (
            <SearchResultCard
              key={pkg.name}
              pkg={pkg}
              selected={selectedPackages.includes(pkg.name)}
              busy={busy}
              onAdd={onAdd}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
