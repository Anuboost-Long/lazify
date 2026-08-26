import type {
	AuditSeverity,
	AuditVulnerability,
	AuditVulnerabilitySource,
	NpmAuditResult,
	OutdatedPackageInfo,
} from "@renderer/shared/types/lazify";

/** A package can carry a dozen advisories; enough to identify it, not all of them. */
const MAX_TITLES = 2;

/** Advisory titles for one entry, or a note that it is only affected via others. */

/** Advisory titles for one entry, or a note that it is only affected via others. */
function advisoryTitles(vuln: AuditVulnerability) {
	const titles = vuln.via
		.filter((entry): entry is AuditVulnerabilitySource => typeof entry === "object")
		.map((entry) => entry.title);

	if (titles.length > 0) {
		const shown = titles.slice(0, MAX_TITLES).join("; ");
		const rest = titles.length - MAX_TITLES;

		return rest > 0 ? `${shown} (+${rest} more)` : shown;
	}

	// A string `via` means this package is only pulled in by another vulnerable one.
	const causes = vuln.via.filter((entry): entry is string => typeof entry === "string");

	return causes.length > 0 ? `affected via ${causes.join(", ")}` : "—";
}

/**
 * The upgrade that would clear a finding. Several findings usually share one:
 * five of them can be a single tooling bump, which is the decision the reader
 * actually has to make.
 */

/**
 * The upgrade that would clear a finding. Several findings usually share one:
 * five of them can be a single tooling bump, which is the decision the reader
 * actually has to make.
 */
function fixTarget(vuln: AuditVulnerability): string {
	if (typeof vuln.fixAvailable === "object") {
		return `${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`;
	}

	return vuln.fixAvailable ? "npm audit fix" : "no fix available";
}

/** Findings bucketed by the upgrade that resolves them, worst bucket first. */

/** Findings bucketed by the upgrade that resolves them, worst bucket first. */
export function groupByFix(vulns: AuditVulnerability[]) {
	const order: AuditSeverity[] = ["critical", "high", "moderate", "low", "info"];
	const groups = new Map<string, AuditVulnerability[]>();

	for (const vuln of vulns) {
		const key = fixTarget(vuln);
		groups.set(key, [...(groups.get(key) ?? []), vuln]);
	}

	const worst = (list: AuditVulnerability[]) =>
		Math.min(...list.map((vuln) => order.indexOf(vuln.severity)));

	return [...groups.entries()]
		.map(([target, list]) => ({ target, list }))
		.sort((a, b) => worst(a.list) - worst(b.list));
}

/** What it would take to fix one entry, in the agent's terms. */

/** What it would take to fix one entry, in the agent's terms. */
function fixNote(vuln: AuditVulnerability) {
	if (vuln.fixAvailable === true) return "`npm audit fix`";

	if (typeof vuln.fixAvailable === "object") {
		return `${vuln.fixAvailable.isSemVerMajor ? "breaking" : "update"}: ${fixTarget(vuln)}`;
	}

	return "no fix available";
}

/**
 * The audit equivalent of {@link buildUpgradeMarkdown}: everything an agent
 * needs to judge each finding, with the safe command separated from the one
 * that can break the build.
 */

/**
 * The audit equivalent of {@link buildUpgradeMarkdown}: everything an agent
 * needs to judge each finding, with the safe command separated from the one
 * that can break the build.
 */
export function buildAuditMarkdown(
	vulns: AuditVulnerability[],
	counts: NpmAuditResult["metadata"]["vulnerabilities"] | undefined,
) {
	const summary = (["critical", "high", "moderate", "low", "info"] as AuditSeverity[])
		.filter((severity) => (counts?.[severity] ?? 0) > 0)
		.map((severity) => `${counts?.[severity]} ${severity}`)
		.join(", ");

	const rows = vulns
		.map(
			(vuln) =>
				`| ${vuln.name} | ${vuln.severity} | ${vuln.isDirect ? "direct" : "transitive"} | ${advisoryTitles(vuln)} | ${fixNote(vuln)} |`,
		)
		.join("\n");

	const forced = vulns.some(
		(vuln) => typeof vuln.fixAvailable === "object" && vuln.fixAvailable.isSemVerMajor,
	);

	// Lead with the decisions rather than the symptoms: several findings usually
	// share one upgrade, and that is what has to be judged.
	const groups = groupByFix(vulns)
		.map(
			({ target, list }) =>
				`- \`${target}\` — clears ${list.length} (${list.map((v) => v.name).join(", ")})`,
		)
		.join("\n");

	const upgrades = groupByFix(vulns).length;
	const safeFixes = vulns.filter((vuln) => vuln.fixAvailable === true).length;
	const finding = vulns.length === 1 ? "finding" : "findings";

	return [
		`Review ${vulns.length} npm audit ${finding}${summary ? ` (${summary})` : ""}.`,
		"",
		`They resolve to ${upgrades} ${upgrades === 1 ? "upgrade" : "upgrades"}:`,
		"",
		groups,
		"",
		...(safeFixes > 0
			? [
					"Start with the non-breaking fixes. Do not run `npm audit fix --force`",
					"without checking what it upgrades — it takes major versions.",
					"",
					"```sh",
					"npm audit fix",
					"```",
					"",
				]
			: [
					"Nothing here is fixable without a major upgrade — `npm audit fix`",
					"will not change anything.",
					"",
				]),
		"| Package | Severity | Depth | Advisory | Fix |",
		"| --- | --- | --- | --- | --- |",
		rows,
		...(forced
			? [
					"",
					"These need a major upgrade, so review each one before taking it:",
					"",
					"```sh",
					"npm audit fix --force",
					"```",
				]
			: []),
		"",
	].join("\n");
}

/**
 * A ready-to-paste brief for a coding agent. Deliberately excludes the majors:
 * their "wanted" is what is already installed, so there is nothing to ask for.
 */

/**
 * A ready-to-paste brief for a coding agent. Deliberately excludes the majors:
 * their "wanted" is what is already installed, so there is nothing to ask for.
 */
export function buildUpgradeMarkdown(packages: [string, OutdatedPackageInfo][]) {
	const rows = packages
		.map(([name, info]) => `| ${name} | ${info.current} | ${info.wanted} |`)
		.join("\n");
	// `npm update` moves the lockfile within the existing ranges. `npm install
	// name@version` would rewrite those ranges, which is what we are asking the
	// agent not to do.
	const names = packages.map(([name]) => name).join(" ");

	return [
		`Update these ${packages.length} npm packages to the version their existing`,
		"semver range already allows. This is not a major upgrade — do not change",
		"any version range in package.json.",
		"",
		"| Package | Current | Target |",
		"| --- | --- | --- |",
		rows,
		"",
		"```sh",
		`npm update ${names}`,
		"```",
		"",
	].join("\n");
}

/**
 * Packages already at the newest version their range allows. Listed for
 * awareness only — taking these means a deliberate major upgrade.
 */
