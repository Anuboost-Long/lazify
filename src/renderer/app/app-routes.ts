export const appRoute = {
  root: "/",
  initProject: "/init-project",
  workspace: "/workspace",
  workspaceProject: "/workspace/project/:projectPath",
  importProject: "/import-project",
  console: "/console",
  templates: "/templates",
  settings: "/settings",
} as const;

export const defaultAppRoute = appRoute.workspace;

export function getWorkspaceProjectRoute(projectPath: string) {
  return `/workspace/project/${encodeURIComponent(projectPath)}`;
}
