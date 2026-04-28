export const appRoute = {
  root: "/",
  workspace: "/workspace",
  console: "/console",
  templates: "/templates",
  settings: "/settings",
} as const;

export const defaultAppRoute = appRoute.workspace;
