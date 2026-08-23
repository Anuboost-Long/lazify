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
  toolsApiStudio: "/tools/api-studio",
  toolsDmgCompiler: "/tools/dmg-compiler",
  toolsEnvironment: "/tools/environment",
  dmgCompiler: "/dmg-compiler",
  legal: "/legal/:doc",
} as const;

export const defaultAppRoute = appRoute.home;

export function getWorkspaceProjectRoute(projectPath: string) {
  return `/workspace/project/${encodeURIComponent(projectPath)}`;
}

/** A project opened straight onto one file, revealed in its tree and focused
 *  on the line that sent the user there. */
export function getWorkspaceFileRoute(projectPath: string, filePath: string, line?: number | null) {
  const at = line ? `&line=${line}` : "";

  return `${getWorkspaceProjectRoute(projectPath)}?file=${encodeURIComponent(filePath)}${at}`;
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
