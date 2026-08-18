import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import type { ToolDefinition } from "./types";

export const apiStudioTool: ToolDefinition = {
  id: "api-studio",
  path: appRoute.toolsApiStudio,
  label: translation.Tools.ApiStudio,
  description: translation.Tools.ApiStudioDesc,
  icon: "network",
  color: "#2f7df4"
};
