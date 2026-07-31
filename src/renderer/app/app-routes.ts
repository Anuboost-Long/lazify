export const appRoute = {
  root: "/",
  initProject: "/init-project",
  workspace: "/workspace",
  workspaceProject: "/workspace/project/:projectPath",
  importProject: "/import-project",
  agents: "/agents",
  browser: "/browser",
  console: "/console",
  templates: "/templates",
  settings: "/settings",
  environment: "/environment",
  dmgCompiler: "/dmg-compiler",
  legal: "/legal/:doc",
} as const;

export const defaultAppRoute = appRoute.workspace;

export function getWorkspaceProjectRoute(projectPath: string) {
  return `/workspace/project/${encodeURIComponent(projectPath)}`;
}

export function getLegalRoute(doc: string) {
  return `/legal/${doc}`;
}
