import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { PackageOption } from "@renderer/shared/types/lazify";
import type { TemplatePackageEntry } from "../../../../main/template-package-manifest";
import { useEffect, useMemo, useState } from "react";

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
            error instanceof Error ? error.message : "Unable to search npm right now."
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
            error instanceof Error ? error.message : "Unable to load template packages."
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            npm packages
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Search the live npm registry and collect multiple packages for installation.
          </p>
        </div>
        <div className="rounded-full border border-border bg-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          {selectedPackages.length} selected
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-border bg-bg/70 p-3">
        <div className="rounded-[20px] border border-border bg-bg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Template packages
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Lazify reads the template manifest and queries the npm searcher so you can review what will be added automatically.
              </p>
            </div>
            <div className="rounded-full border border-border bg-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              {templatePackages.length} queued
            </div>
          </div>

          {templatePackagesLoading ? (
            <div className="mt-3 flex min-h-[2rem] items-center gap-2 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
              <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
              Querying npm search for template packages...
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
                        <span className="font-semibold text-text">{pkg.name}</span>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">
                          npm v{pkg.version || pkg.requestedVersion}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        {pkg.description || "No description returned from npm search."}
                      </p>

                      <p className="mt-2 text-xs text-muted">
                        Template version: {pkg.requestedVersion}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-full border border-current/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                      Will add
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!templatePackagesLoading && !templatePackagesError && templatePackages.length === 0 ? (
            <div className="mt-3 rounded-[16px] border border-dashed border-border px-3 py-3 text-sm text-muted">
              No template package manifest entries were found for this stack.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-3">
          <UiIcon name="search" className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search npm packages like zustand, react-query, shadcn..."
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>

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
                        <span className="font-semibold text-text">{pkg.name}</span>
                        {pkg.version ? (
                          <span className="text-xs uppercase tracking-[0.18em] text-muted">
                            v{pkg.version}
                          </span>
                        ) : null}
                        {pkg.publisher ? (
                          <span className="rounded-full border border-border bg-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                            {pkg.publisher}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        {pkg.description || "Selected for installation in a later workflow step."}
                      </p>

                      {pkg.keywords.length > 0 ? (
                        <p className="mt-2 text-xs text-muted">
                          {pkg.keywords.slice(0, 5).join(" • ")}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePackage(packageName)}
                      disabled={busy}
                      className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-soft px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                      <UiIcon
                        name="xmark"
                        className="h-4 w-4 text-muted transition group-hover:text-accent"
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
              Type at least 2 characters to search npm.
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[2rem] items-center gap-2 px-3 text-sm text-muted">
              <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
              Searching npm registry...
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="flex min-h-[2rem] items-center px-3 text-sm text-error">
              {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && query.trim().length >= 2 && results.length === 0 ? (
            <div className="flex min-h-[2rem] items-center px-3 text-sm text-muted">
              No packages matched this query.
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
                      "w-full rounded-[18px] border px-4 py-3 text-left transition",
                      selected
                        ? "border-accent bg-accentSoft text-text"
                        : "border-border bg-soft text-text hover:border-accent hover:bg-bg",
                      "disabled:cursor-not-allowed disabled:opacity-80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{pkg.name}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted">
                            v{pkg.version}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">
                          {pkg.description || "No description provided."}
                        </p>
                        {pkg.keywords.length > 0 ? (
                          <p className="mt-2 text-xs text-muted">
                            {pkg.keywords.slice(0, 4).join(" • ")}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 rounded-full border border-current/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
                        {selected ? "Selected" : "Add"}
                      </div>
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
