import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import type { ToolDefinition } from "./types";

export const dmgCompilerTool: ToolDefinition = {
  id: "dmg-compiler",
  path: appRoute.toolsDmgCompiler,
  label: translation.Tools.DmgCompiler,
  description: translation.Tools.DmgCompilerDesc,
  icon: "hard-drive",
  color: "#00b8a9",
  macOnly: true
};
