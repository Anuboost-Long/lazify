import { EnvironmentRoute } from "./EnvironmentRoute";
import { InitProjectFlowRoute } from "./InitProjectFlowRoute";
import { InitProjectSelectionRoute } from "./InitProjectSelectionRoute";
import { InitProjectSetupRoute } from "./InitProjectSetupRoute";
import { ImportTemplateRoute } from "./ImportTemplateRoute";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../AppShell";
import { appRoute, defaultAppRoute } from "../app-routes";
import { AgentsRoute } from "./AgentsRoute";
import { HomeRoute } from "./HomeRoute";
import { BrowserRoute } from "./BrowserRoute";
import { InitProjectProgressRoute } from "./InitProjectProgressRoute";
import { DmgCompilerRoute } from "./DmgCompilerRoute";
import { PromptBuilderRoute } from "./PromptBuilderRoute";
import { ApiStudioRoute } from "./ApiStudioRoute";
import { ToolsRoute } from "./ToolsRoute";
import { LegalRoute } from "./LegalRoute";
import { SettingsRoute } from "./SettingsRoute";
import { SyncedProjectRoute } from "./SyncedProjectRoute";
import { TemplatesRoute } from "./TemplatesRoute";
import { TemplatesFlowRoute } from "./TemplatesFlowRoute";
import { TemplateEditRoute } from "./TemplateEditRoute";
import { WorkspaceRoute } from "./WorkspaceRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoute.root} element={<AppShell />}>
        <Route index element={<Navigate to={defaultAppRoute} replace />} />
        <Route path={appRoute.initProject.slice(1)} element={<InitProjectFlowRoute />}>
          <Route index element={<InitProjectSelectionRoute />} />
          <Route path="setup" element={<InitProjectSetupRoute />} />
          <Route path="progress" element={<InitProjectProgressRoute />} />
        </Route>
        <Route path={appRoute.home.slice(1)} element={<HomeRoute />} />
        <Route path={appRoute.workspace.slice(1)} element={<WorkspaceRoute />} />
        <Route path={appRoute.workspaceProject.slice(1)} element={<SyncedProjectRoute />} />
        <Route path="import-project" element={<Navigate to={appRoute.templateImport} replace />} />
        <Route path={appRoute.agents.slice(1)} element={<AgentsRoute />} />
        <Route path={appRoute.browser.slice(1)} element={<BrowserRoute />} />
        <Route path={appRoute.templates.slice(1)} element={<TemplatesFlowRoute />}>
          <Route index element={<TemplatesRoute />} />
          <Route path="import" element={<ImportTemplateRoute />} />
          <Route path=":templateId/edit" element={<TemplateEditRoute />} />
        </Route>
        <Route path={appRoute.settings.slice(1)} element={<SettingsRoute />} />
        <Route path={appRoute.toolsEnvironment.slice(1)} element={<EnvironmentRoute />} />
        <Route
          path={appRoute.environment.slice(1)}
          element={<Navigate to={appRoute.toolsEnvironment} replace />}
        />
        <Route path={appRoute.tools.slice(1)} element={<ToolsRoute />} />
        <Route path={appRoute.toolsPromptBuilder.slice(1)} element={<PromptBuilderRoute />} />
        <Route path={appRoute.toolsApiStudio.slice(1)} element={<ApiStudioRoute />} />
        <Route path={appRoute.toolsDmgCompiler.slice(1)} element={<DmgCompilerRoute />} />
        {/* The tool moved under Tools; the old address still works. */}
        <Route
          path={appRoute.dmgCompiler.slice(1)}
          element={<Navigate to={appRoute.toolsDmgCompiler} replace />}
        />
        <Route path={appRoute.legal.slice(1)} element={<LegalRoute />} />
        <Route path="*" element={<Navigate to={defaultAppRoute} replace />} />
      </Route>
    </Routes>
  );
}
