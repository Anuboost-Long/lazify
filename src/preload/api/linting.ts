import { ipcRenderer } from "electron";

import type { FixTaskInput, LintResult } from "../../main/linting";
import type { Task } from "../../main/tasks/types";
export const lintingApi = {
	lintFile: (filePath: string, content: string): Promise<LintResult> =>
		ipcRenderer.invoke("lazify:lint-file", filePath, content),
	createFixTask: (input: FixTaskInput): Promise<Task | null> =>
		ipcRenderer.invoke("lazify:create-fix-task", input),
};
