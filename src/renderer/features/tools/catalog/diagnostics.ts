import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";

import type { ToolDefinition } from "./types";

export const diagnosticsTool: ToolDefinition = {
	id: "diagnostics",
	path: appRoute.toolsDiagnostics,
	label: translation.Tools.Diagnostics,
	description: translation.Tools.DiagnosticsDesc,
	icon: "health-cross",
	color: "#2f9e6a",
};
