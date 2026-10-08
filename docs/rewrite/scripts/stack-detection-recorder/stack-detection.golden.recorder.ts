import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { detectProjectStack } from "../../../../../lazify/src/brain/stack-detection/detect-stack";
import { STACK_DETECTION_CASES } from "../../../../tests/shared/lib/stack-detection/stack-detection.cases";

const base = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-stack-detection-"));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("detectProjectStack golden", () => {
	STACK_DETECTION_CASES.forEach(({ name, tree }, index) => {
		it(name, async () => {
			const root = path.join(base, String(index));
			await fs.mkdir(root, { recursive: true });

			for (const [relative, contents] of Object.entries(tree)) {
				const target = path.join(root, relative);

				if (relative.endsWith("/")) {
					await fs.mkdir(target, { recursive: true });
					continue;
				}

				await fs.mkdir(path.dirname(target), { recursive: true });
				await fs.writeFile(target, contents);
			}

			expect(await detectProjectStack(root)).toMatchSnapshot();
		});
	});
});
