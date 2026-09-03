import fs from "node:fs/promises";
import path from "node:path";

import type { DiagnosticConfig, DiagnosticTargetKind, FlowSource } from "../types";

const DIAGNOSTICS_DIR = path.join(".lazify", "diagnostics");
const FLOW_EXTENSIONS = new Set([".yaml", ".yml"]);

export const DEFAULT_CONFIG: DiagnosticConfig = {
	defaultTarget: "web",
	baseUrl: "",
	flowsDir: path.join(DIAGNOSTICS_DIR, "flows"),
	artifactsDir: "",
	secrets: [],
	retainRuns: 20,
	stepTimeoutMs: 10_000,
};

export function diagnosticsDirectory(projectPath: string): string {
	return path.join(path.resolve(projectPath), DIAGNOSTICS_DIR);
}

export function configFile(projectPath: string): string {
	return path.join(diagnosticsDirectory(projectPath), "config.json");
}

export function resolveInProject(projectPath: string, directory: string): string {
	return path.isAbsolute(directory) ? directory : path.join(path.resolve(projectPath), directory);
}

export function flowsDirectory(projectPath: string, config: DiagnosticConfig): string {
	return resolveInProject(projectPath, config.flowsDir || DEFAULT_CONFIG.flowsDir);
}

async function readIfPresent(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

export async function readFlowFile(
	projectPath: string,
	config: DiagnosticConfig,
	filePath: string,
): Promise<FlowSource> {
	const absolute = path.isAbsolute(filePath)
		? filePath
		: path.join(flowsDirectory(projectPath, config), filePath);

	return {
		filePath: absolute,
		relativePath: path.relative(path.resolve(projectPath), absolute),
		text: await fs.readFile(absolute, "utf8"),
	};
}

export async function listFlowFiles(
	projectPath: string,
	config: DiagnosticConfig,
): Promise<FlowSource[]> {
	const directory = flowsDirectory(projectPath, config);

	let names: string[];
	try {
		names = await fs.readdir(directory);
	} catch {
		return [];
	}

	const flowNames = names
		.filter((name) => FLOW_EXTENSIONS.has(path.extname(name)))
		.sort((left, right) => left.localeCompare(right));

	return Promise.all(flowNames.map((name) => readFlowFile(projectPath, config, name)));
}

export async function writeFlowFile(
	projectPath: string,
	config: DiagnosticConfig,
	fileName: string,
	text: string,
): Promise<FlowSource> {
	const directory = flowsDirectory(projectPath, config);
	await fs.mkdir(directory, { recursive: true });

	const absolute = path.join(directory, fileName);
	await fs.writeFile(absolute, text, "utf8");

	return {
		filePath: absolute,
		relativePath: path.relative(path.resolve(projectPath), absolute),
		text,
	};
}

export async function deleteFlowFile(
	projectPath: string,
	config: DiagnosticConfig,
	fileName: string,
): Promise<void> {
	await fs.rm(path.join(flowsDirectory(projectPath, config), fileName), { force: true });
}

function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function positiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && value > 0 ? value : fallback;
}

function text(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

export async function readDiagnosticConfig(projectPath: string): Promise<DiagnosticConfig> {
	const raw = await readIfPresent(configFile(projectPath));
	if (!raw) return DEFAULT_CONFIG;

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return DEFAULT_CONFIG;
	}

	return {
		defaultTarget: (parsed.defaultTarget as DiagnosticTargetKind) || DEFAULT_CONFIG.defaultTarget,
		baseUrl: text(parsed.baseUrl, DEFAULT_CONFIG.baseUrl),
		flowsDir: text(parsed.flowsDir, DEFAULT_CONFIG.flowsDir),
		artifactsDir: text(parsed.artifactsDir, DEFAULT_CONFIG.artifactsDir),
		secrets: asStringList(parsed.secrets),
		retainRuns: positiveNumber(parsed.retainRuns, DEFAULT_CONFIG.retainRuns),
		stepTimeoutMs: positiveNumber(parsed.stepTimeoutMs, DEFAULT_CONFIG.stepTimeoutMs),
	};
}

export async function writeDiagnosticConfig(
	projectPath: string,
	config: DiagnosticConfig,
): Promise<DiagnosticConfig> {
	await fs.mkdir(diagnosticsDirectory(projectPath), { recursive: true });
	await fs.writeFile(configFile(projectPath), `${JSON.stringify(config, null, 2)}\n`, "utf8");

	return config;
}
