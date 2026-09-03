import { agentsApi } from "./agents";
import { apiDocsApi } from "./api-docs";
import { apiStudioApi } from "./api-studio";
import { browserApi } from "./browser";
import { codeIntelligenceApi } from "./code-intelligence";
import { diagnosticTestsApi } from "./diagnostic-tests";
import { dmgApi } from "./dmg";
import { envApi } from "./env";
import { environmentApi } from "./environment";
import { extensionsApi } from "./extensions";
import { formattingApi } from "./formatting";
import { gitApi } from "./git";
import { lintingApi } from "./linting";
import { mediaApi } from "./media";
import { packagesApi } from "./packages";
import { projectsApi } from "./projects";
import { promptsApi } from "./prompts";
import { scriptsApi } from "./scripts";
import { systemApi } from "./system";
import { tasksApi } from "./tasks";
import { templatesApi } from "./templates";
import { updaterApi } from "./updater";
import { workflowApi } from "./workflow";

export const lazifyApi = {
	...agentsApi,
	...apiDocsApi,
	...apiStudioApi,
	...browserApi,
	...codeIntelligenceApi,
	...diagnosticTestsApi,
	...dmgApi,
	...envApi,
	...environmentApi,
	...extensionsApi,
	...formattingApi,
	...gitApi,
	...lintingApi,
	...mediaApi,
	...packagesApi,
	...projectsApi,
	...promptsApi,
	...scriptsApi,
	...systemApi,
	...tasksApi,
	...templatesApi,
	...updaterApi,
	...workflowApi,
};
