import { watchFolder } from "@/platform/folders";
import { ensureLazifyDirectory } from "@/shared/lib/projects/lazify-directory";

import { readCustomCollections } from "../custom-collections";
import { briefFiles } from "./brief";

const SETTLE_MS = 600;

export async function watchDocDraft(
	projectPath: string,
	collectionId: string,
	onChange: () => void,
): Promise<(() => void) | null> {
	const collection = (await readCustomCollections(projectPath)).find((one) => one.id === collectionId);

	if (!collection) return null;

	const files = briefFiles(projectPath, collection);

	await ensureLazifyDirectory(projectPath, files.directory);

	let settle: ReturnType<typeof setTimeout> | null = null;

	try {
		const stop = await watchFolder(files.directory, (paths) => {
			if (!paths.includes(files.answerPath)) return;
			if (settle) clearTimeout(settle);

			settle = setTimeout(onChange, SETTLE_MS);
		});

		return () => {
			if (settle) clearTimeout(settle);

			stop();
		};
	} catch {
		return null;
	}
}
