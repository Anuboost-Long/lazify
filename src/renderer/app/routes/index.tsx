import { EnvironmentRoute } from "./EnvironmentRoute";
import { InitProjectRoute } from "./InitProjectRoute";
import { ImportProjectRoute } from "./ImportProjectRoute";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../AppShell";
import { appRoute, defaultAppRoute } from "../app-routes";
import { AgentsRoute } from "./AgentsRoute";
import { ConsoleRoute } from "./ConsoleRoute";
import { SettingsRoute } from "./SettingsRoute";
import { SyncedProjectRoute } from "./SyncedProjectRoute";
import { TemplatesRoute } from "./TemplatesRoute";
import { WorkspaceRoute } from "./WorkspaceRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoute.root} element={<AppShell />}>
        <Route index element={<Navigate to={defaultAppRoute} replace />} />
        <Route path={appRoute.initProject.slice(1)} element={<InitProjectRoute />} />
        <Route path={appRoute.workspace.slice(1)} element={<WorkspaceRoute />} />
        <Route path={appRoute.workspaceProject.slice(1)} element={<SyncedProjectRoute />} />
        <Route path={appRoute.importProject.slice(1)} element={<ImportProjectRoute />} />
        <Route path={appRoute.agents.slice(1)} element={<AgentsRoute />} />
        <Route path={appRoute.console.slice(1)} element={<ConsoleRoute />} />
        <Route path={appRoute.templates.slice(1)} element={<TemplatesRoute />} />
        <Route path={appRoute.settings.slice(1)} element={<SettingsRoute />} />
        <Route path={appRoute.environment.slice(1)} element={<EnvironmentRoute />} />
        <Route path="*" element={<Navigate to={defaultAppRoute} replace />} />
      </Route>
    </Routes>
  );
}
