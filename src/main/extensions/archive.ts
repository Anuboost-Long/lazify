import fs from "node:fs";
import path from "node:path";

import unzipper from "unzipper";

const isContained = (root: string, target: string) => {
	const relative = path.relative(root, target);

	return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
};

export async function extractVsix(archive: Buffer, targetDir: string): Promise<void> {
	const directory = await unzipper.Open.buffer(archive);

	fs.rmSync(targetDir, { recursive: true, force: true });
	fs.mkdirSync(targetDir, { recursive: true });

	for (const file of directory.files) {
		if (file.type !== "File") continue;

		const destination = path.join(targetDir, file.path);

		if (!isContained(targetDir, destination)) continue;

		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.writeFileSync(destination, await file.buffer());
	}
}
