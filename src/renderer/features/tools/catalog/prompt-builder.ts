import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import type { ToolDefinition } from "./types";

export const promptBuilderTool: ToolDefinition = {
  id: "prompt-builder",
  path: appRoute.toolsPromptBuilder,
  label: translation.Tools.PromptBuilder,
  description: translation.Tools.PromptBuilderDesc,
  icon: "sparks",
  color: "#7c5cff"
};
