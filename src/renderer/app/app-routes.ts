export const appRoute = {
  root: "/",
  home: "/home",
  initProject: "/init-project",
  initProjectSetup: "/init-project/setup",
  initProjectProgress: "/init-project/progress",
  workspace: "/workspace",
  workspaceProject: "/workspace/project/:projectPath",
  agents: "/agents",
  browser: "/browser",
  templates: "/templates",
  templateImport: "/templates/import",
  templateEdit: "/templates/:templateId/edit",
  settings: "/settings",
  environment: "/environment",
  tools: "/tools",
  toolsPromptBuilder: "/tools/prompt-builder",
  toolsDmgCompiler: "/tools/dmg-compiler",
  toolsEnvironment: "/tools/environment",
  dmgCompiler: "/dmg-compiler",
  legal: "/legal/:doc",
} as const;

export const defaultAppRoute = appRoute.home;

export function getWorkspaceProjectRoute(projectPath: string) {
  return `/workspace/project/${encodeURIComponent(projectPath)}`;
}

/** The agents page, opened straight onto one project rather than whichever the
 *  shared active project happens to be. */
export function getAgentsRoute(projectPath: string) {
  return `/agents?project=${encodeURIComponent(projectPath)}`;
}

export function getTemplateEditRoute(templateId: string) {
  return `/templates/${encodeURIComponent(templateId)}/edit`;
}

export function getLegalRoute(doc: string) {
  return `/legal/${doc}`;
}
