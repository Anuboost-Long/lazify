import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import type { ToolDefinition } from "./types";

export const environmentTool: ToolDefinition = {
  id: "environment",
  path: appRoute.toolsEnvironment,
  label: translation.Tools.Environment,
  description: translation.Tools.EnvironmentDesc,
  icon: "activity",
  color: "#f0a02c"
};
