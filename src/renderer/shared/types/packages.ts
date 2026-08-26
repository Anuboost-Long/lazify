export type MatchAction = "keep" | "update" | "downgrade";

export type CompatibilityStatus = "compatible" | "incompatible" | "unknown";

export interface PackageMatch {
	name: string;
	currentSpec: string;
	currentVersion: string;
	targetVersion: string | null;
	action: MatchAction;
	compatibility: CompatibilityStatus;
	reason: string;
}

export interface VersionMatchReport {
	projectPath: string;
	anchorPackage: string;
	anchorVersion: string;
	packages: PackageMatch[];
	unresolved: string[];
	installPlan: string[];
}

export interface InstalledPackage {
	name: string;
	versionSpec: string;
	isDev: boolean;
}

// ─── Project Health ───────────────────────────────────────────────────────────

export interface OutdatedPackageInfo {
	current: string;
	wanted: string;
	latest: string;
	dependent: string;
	location: string;
}

export interface NpmOutdatedResult {
	packages: Record<string, OutdatedPackageInfo>;
	error?: string;
}

export type AuditSeverity = "critical" | "high" | "moderate" | "low" | "info";

export interface AuditVulnerabilitySource {
	source: number;
	name: string;
	dependency: string;
	title: string;
	url: string;
	severity: AuditSeverity;
	range: string;
}

export interface AuditFixInfo {
	name: string;
	version: string;
	isSemVerMajor: boolean;
}

export interface AuditVulnerability {
	name: string;
	severity: AuditSeverity;
	isDirect: boolean;
	via: Array<string | AuditVulnerabilitySource>;
	effects: string[];
	range: string;
	nodes: string[];
	fixAvailable: boolean | AuditFixInfo;
}

export interface AuditVulnerabilityCounts {
	info: number;
	low: number;
	moderate: number;
	high: number;
	critical: number;
	total: number;
}

export interface NpmAuditResult {
	auditReportVersion?: number;
	vulnerabilities: Record<string, AuditVulnerability>;
	metadata: {
		vulnerabilities: AuditVulnerabilityCounts;
		dependencies: {
			prod: number;
			dev: number;
			optional: number;
			peer: number;
			peerOptional: number;
			total: number;
		};
	};
	error?: string;
}
