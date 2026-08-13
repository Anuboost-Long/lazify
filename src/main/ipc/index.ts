import { registerAgentHandlers } from "./agents";
import { registerBrowserHandlers } from "./browser";
import { registerCodeIntelligenceHandlers } from "./code-intelligence";
import type { IpcContext } from "./context";
import { registerDmgHandlers } from "./dmg";
import { registerEnvFileHandlers } from "./env";
import { registerEnvironmentHandlers } from "./environment";
import { registerGitHandlers } from "./git";
import { registerMediaHandlers } from "./media";
import { registerPackageHandlers } from "./packages";
import { registerProjectHandlers } from "./projects";
import { registerScriptHandlers } from "./scripts";
import { registerSystemHandlers } from "./system";
import { registerTemplateHandlers } from "./templates";
import { registerUpdaterHandlers } from "./updater";
import { registerWorkflowHandlers } from "./workflow";

export type { IpcContext };

export function registerDomainHandlers(ctx: IpcContext) {
  registerWorkflowHandlers(ctx);
  registerEnvironmentHandlers();
  registerEnvFileHandlers();
  registerTemplateHandlers();
  registerProjectHandlers(ctx);
  registerUpdaterHandlers();
  registerGitHandlers();
  registerScriptHandlers(ctx);
  registerAgentHandlers(ctx);
  registerCodeIntelligenceHandlers();
  registerSystemHandlers(ctx);
  registerDmgHandlers(ctx);
  registerBrowserHandlers();
  registerMediaHandlers();
  registerPackageHandlers(ctx);
}
