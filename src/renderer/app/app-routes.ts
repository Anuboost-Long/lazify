export const appRoute = {
  root: "/",
  initProject: "/init-project",
  workspace: "/workspace",
  importProject: "/import-project",
  test: "/test",
  console: "/console",
  templates: "/templates",
  settings: "/settings",
} as const;

export const defaultAppRoute = appRoute.workspace;
