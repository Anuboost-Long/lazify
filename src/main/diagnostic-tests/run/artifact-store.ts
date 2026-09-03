import fs from "node:fs/promises";
import path from "node:path";

import type { ArtifactRef } from "../types";

function safeName(name: string): string {
	const segments = name.replace(/[^a-z0-9._-]+/gi, "-").split("-");

	return segments.filter(Boolean).join("-") || "artifact";
}

export class ArtifactStore {
	private readonly artifacts: ArtifactRef[] = [];

	constructor(readonly directory: string) {}

	async prepare(): Promise<void> {
		await fs.mkdir(this.directory, { recursive: true });
	}

	pathFor(name: string, extension: string): string {
		return path.join(this.directory, `${safeName(name)}${extension}`);
	}

	private track(name: string, filePath: string, kind: ArtifactRef["kind"]): ArtifactRef {
		const artifact: ArtifactRef = {
			name,
			filePath,
			kind,
			capturedAt: new Date().toISOString(),
		};

		this.artifacts.push(artifact);

		return artifact;
	}

	async writeText(name: string, text: string): Promise<ArtifactRef> {
		const filePath = this.pathFor(name, ".log");

		await this.prepare();
		await fs.writeFile(filePath, text, "utf8");

		return this.track(name, filePath, "log");
	}

	registerScreenshot(name: string, filePath: string): ArtifactRef {
		return this.track(name, filePath, "screenshot");
	}

	list(): ArtifactRef[] {
		return [...this.artifacts];
	}
}

export async function pruneRunDirectories(root: string, keep: number): Promise<void> {
	let entries: string[];
	try {
		entries = await fs.readdir(root);
	} catch {
		return;
	}

	entries.sort((left, right) => right.localeCompare(left));

	const stale = entries.slice(keep);

	await Promise.all(
		stale.map((name) => fs.rm(path.join(root, name), { recursive: true, force: true })),
	);
}
