/**
 * The environment pane's main-process API, in one import.
 *
 * The implementation lives in a module per concern — one file per tool under
 * `tools/`, the scan and the actions beside it, nvm and port scanning on their
 * own. This stays because it is what the IPC layer, the preload bridge and the
 * renderer's types already import, and none of them care how the answers are
 * assembled.
 */

export { installNvm, listNvmVersions, nvmSetDefault, nvmUse } from "./nvm-manager";
export type { NvmInstallResult, NvmNodeVersion, NvmVersionList } from "./nvm-manager";

export { buildProcessTree, getDescendantPids, readCommandLines, scanListeningPorts } from "./ports";
export type { ListeningPort } from "./ports";

export { checkToolUpdate, installTool, uninstallTool, updateTool } from "./tool-actions";
export type { NvmActionResult } from "./tool-actions";

export { probeSingleTool, scanTools } from "./tool-scan";

export type {
  DetectedTool,
  ToolCategory,
  ToolScanReport,
  ToolUpdateInfo
} from "./tools/types";
