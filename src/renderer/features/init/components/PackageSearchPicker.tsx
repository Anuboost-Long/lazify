import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText, PillText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { PackageOption } from "@renderer/shared/types/lazify";
import type { TemplatePackageEntry } from "../../../../main/template-package-manifest";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface PackageSearchPickerProps {
  value: string;
  selectedTemplateId: string;
  busy: boolean;
  onChange: (value: string) => void;
}

interface TemplatePackagePreview extends PackageOption {
  requestedVersion: string;
}

function parsePackageNames(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFallbackPackageOption(packageName: string): PackageOption {
  return {
    name: packageName,
    version: "",
    description: "",
    keywords: [],
    publisher: null
  };
}

export function PackageSearchPicker({
  value,
  selectedTemplateId,
  busy,
  onChange
}: PackageSearchPickerProps) {
  const { t } = useTranslation();
  const selectedPackages = useMemo(() => parsePackageNames(value), [value]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<Record<string, PackageOption>>({});
  const [templatePackages, setTemplatePackages] = useState<TemplatePackagePreview[]>([]);
  const [templatePackagesLoading, setTemplatePackagesLoading] = useState(false);
  const [templatePackagesError, setTemplatePackagesError] = useState("");

  useEffect(() => {
    setSelectedPackageDetails((current) => {
      const nextEntries = selectedPackages.map((packageName) => [
        packageName,
        current[packageName] ?? getFallbackPackageOption(packageName)
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
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const packages = await window.lazify.searchNpmPackages(normalizedQuery);

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
            error instanceof Error ? error.message : t(translation.PackageSearch.NpmError)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
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
        const manifestPackages = await window.lazify.getTemplatePackageManifest(selectedTemplateId);
        const previews = await resolveTemplatePackagePreviews(manifestPackages);

        if (!cancelled) {
          setTemplatePackages(previews);
        }
      } catch (error) {
        if (!cancelled) {
          setTemplatePackages([]);
          setTemplatePackagesError(
            error instanceof Error ? error.message : t(translation.PackageSearch.TemplateError)
          );
        }
      } finally {
        if (!cancelled) {
          setTemplatePackagesLoading(false);
        }
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

    setSelectedPackageDetails((current) => ({
      ...current,
      [pkg.name]: pkg
    }));
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
          <OverlineText className="text-accent">
            {t(translation.PackageSearch.NpmPackages)}
          </OverlineText>
          <BodyText className="mt-2 text-muted">
            {t(translation.PackageSearch.NpmDesc)}
          </BodyText>
        </div>
        <PillText className="rounded-full border border-border bg-soft px-3 py-2 text-muted">
          {t(translation.PackageSearch.SelectedCount, { count: selectedPackages.length })}
        </PillText>
      </div>

      <div className="mt-4 rounded-[24px] border border-border bg-bg/70 p-3">
        <div className="rounded-[20px] border border-border bg-bg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <OverlineText className="text-accent">
                {t(translation.PackageSearch.TemplatePackages)}
              </OverlineText>
              <BodyText className="mt-2 text-muted">
                {t(translation.PackageSearch.TemplateDesc)}
              </BodyText>
            </div>
            <PillText className="rounded-full border border-border bg-soft px-3 py-2 text-muted">
              {t(translation.PackageSearch.QueuedCount, { count: templatePackages.length })}
            </PillText>
          </div>

          {templatePackagesLoading ? (
            <div className="mt-3 flex min-h-[2rem] items-center gap-2 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
              <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
              {t(translation.PackageSearch.QueryingNpm)}
            </div>
          ) : null}

          {!templatePackagesLoading && templatePackagesError ? (
            <div className="mt-3 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-error">
              {templatePackagesError}
            </div>
          ) : null}

          {!templatePackagesLoading && !templatePackagesError && templatePackages.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {templatePackages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="rounded-[18px] border border-border bg-soft px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle as="span" className="text-text">{pkg.name}</CardTitle>
                        <PillText as="span" className="text-muted">
                          npm v{pkg.version || pkg.requestedVersion}
                        </PillText>
                      </div>

                      <BodyText className="mt-1 text-muted">
                        {pkg.description || t(translation.PackageSearch.NoDescriptionReturned)}
                      </BodyText>

                      <BodyText className="mt-2 text-xs text-muted">
                        {t(translation.PackageSearch.TemplateVersion, { version: pkg.requestedVersion })}
                      </BodyText>
                    </div>

                    <PillText className="shrink-0 rounded-full border border-current/15 px-3 py-2 text-muted">
                      {t(translation.PackageSearch.WillAdd)}
                    </PillText>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!templatePackagesLoading && !templatePackagesError && templatePackages.length === 0 ? (
            <div className="mt-3 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
              {t(translation.PackageSearch.NoTemplateEntries)}
            </div>
          ) : null}
        </div>

        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(translation.PackageSearch.SearchPlaceholder)}
          icon="search"
          className="mt-4"
        />

        {selectedPackages.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {selectedPackages.map((packageName) => {
              const pkg = selectedPackageDetails[packageName] ?? getFallbackPackageOption(packageName);

              return (
                <div
                  key={packageName}
                  className="rounded-[18px] border border-border bg-bg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle as="span" className="text-text">{pkg.name}</CardTitle>
                        {pkg.version ? (
                          <PillText as="span" className="text-muted">
                            v{pkg.version}
                          </PillText>
                        ) : null}
                        {pkg.publisher ? (
                          <PillText as="span" className="rounded-full border border-border bg-soft px-2 py-1 text-[10px] text-muted">
                            {pkg.publisher}
                          </PillText>
                        ) : null}
                      </div>

                      <BodyText className="mt-1 text-muted">
                        {pkg.description || t(translation.PackageSearch.SelectedForInstall)}
                      </BodyText>

                      {pkg.keywords.length > 0 ? (
                        <BodyText className="mt-2 text-xs text-muted">
                          {pkg.keywords.slice(0, 5).join(" • ")}
                        </BodyText>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePackage(packageName)}
                      disabled={busy}
                      className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-soft px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(translation.GlobalTerm.Remove)}
                      <UiIcon
                        name="xmark"
                        className="h-4 w-4 text-muted group-hover:text-accent"
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-3 min-h-[3rem] rounded-[20px] border border-dashed border-border bg-bg p-2">
          {query.trim().length < 2 ? (
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

          {!loading && errorMessage ? (
            <div className="flex min-h-[2rem] items-center px-3 text-sm text-error">
              {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && query.trim().length >= 2 && results.length === 0 ? (
            <div className="flex min-h-[2rem] items-center px-3 text-sm text-muted">
              {t(translation.PackageSearch.NoResults)}
            </div>
          ) : null}

          {!loading && !errorMessage && results.length > 0 ? (
            <div className="grid gap-2">
              {results.map((pkg) => {
                const selected = selectedPackages.includes(pkg.name);

                return (
                  <button
                    key={pkg.name}
                    type="button"
                    onClick={() => addPackage(pkg)}
                    disabled={busy || selected}
                    className={clsx(
                      "w-full rounded-[18px] border px-4 py-3 text-left",
                      selected
                        ? "border-accent bg-accentSoft text-text"
                        : "border-border bg-soft text-text hover:border-accent hover:bg-bg",
                      "disabled:cursor-not-allowed disabled:opacity-80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle as="span" className="text-inherit">{pkg.name}</CardTitle>
                          <PillText as="span" className="text-muted">
                            v{pkg.version}
                          </PillText>
                        </div>
                        <BodyText className="mt-1 line-clamp-2 text-muted">
                          {pkg.description || t(translation.PackageSearch.NoDescription)}
                        </BodyText>
                        {pkg.keywords.length > 0 ? (
                          <BodyText className="mt-2 text-xs text-muted">
                            {pkg.keywords.slice(0, 4).join(" • ")}
                          </BodyText>
                        ) : null}
                      </div>

                      <PillText className="shrink-0 rounded-full border border-current/15 px-3 py-2">
                        {selected ? t(translation.GlobalTerm.Selected) : t(translation.GlobalTerm.Add)}
                      </PillText>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function resolveTemplatePackagePreviews(
  manifestPackages: TemplatePackageEntry[]
): Promise<TemplatePackagePreview[]> {
  const previews = await Promise.all(
    manifestPackages.map(async (entry) => {
      try {
        const matches = await window.lazify.searchNpmPackages(entry.name);
        const exactMatch = matches.find((pkg) => pkg.name === entry.name);
        const pkg = exactMatch ?? getFallbackPackageOption(entry.name);

        return {
          ...pkg,
          requestedVersion: entry.version
        };
      } catch {
        return {
          ...getFallbackPackageOption(entry.name),
          description: "Package metadata is unavailable right now, but this dependency is still listed in the template manifest.",
          requestedVersion: entry.version
        };
      }
    })
  );

  return previews;
}
