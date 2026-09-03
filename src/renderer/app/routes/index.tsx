import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { appRoute, defaultAppRoute } from "../app-routes";
import { AppShell } from "../AppShell";
import { HomeRoute } from "./HomeRoute";

const AgentsRoute = lazy(async () => ({ default: (await import("./AgentsRoute")).AgentsRoute }));
const ApiStudioRoute = lazy(async () => ({
	default: (await import("./ApiStudioRoute")).ApiStudioRoute,
}));
const BrowserRoute = lazy(async () => ({ default: (await import("./BrowserRoute")).BrowserRoute }));
const DiagnosticsRoute = lazy(async () => ({
	default: (await import("./DiagnosticsRoute")).DiagnosticsRoute,
}));
const DmgCompilerRoute = lazy(async () => ({
	default: (await import("./DmgCompilerRoute")).DmgCompilerRoute,
}));
const EnvironmentRoute = lazy(async () => ({
	default: (await import("./EnvironmentRoute")).EnvironmentRoute,
}));
const ImportTemplateRoute = lazy(async () => ({
	default: (await import("./ImportTemplateRoute")).ImportTemplateRoute,
}));
const InitProjectFlowRoute = lazy(async () => ({
	default: (await import("./InitProjectFlowRoute")).InitProjectFlowRoute,
}));
const InitProjectProgressRoute = lazy(async () => ({
	default: (await import("./InitProjectProgressRoute")).InitProjectProgressRoute,
}));
const InitProjectSelectionRoute = lazy(async () => ({
	default: (await import("./InitProjectSelectionRoute")).InitProjectSelectionRoute,
}));
const InitProjectSetupRoute = lazy(async () => ({
	default: (await import("./InitProjectSetupRoute")).InitProjectSetupRoute,
}));
const LegalRoute = lazy(async () => ({ default: (await import("./LegalRoute")).LegalRoute }));
const PromptBuilderRoute = lazy(async () => ({
	default: (await import("./PromptBuilderRoute")).PromptBuilderRoute,
}));
const SettingsRoute = lazy(async () => ({
	default: (await import("./SettingsRoute")).SettingsRoute,
}));
const SyncedProjectRoute = lazy(async () => ({
	default: (await import("./SyncedProjectRoute")).SyncedProjectRoute,
}));
const TemplateEditRoute = lazy(async () => ({
	default: (await import("./TemplateEditRoute")).TemplateEditRoute,
}));
const TemplatesFlowRoute = lazy(async () => ({
	default: (await import("./TemplatesFlowRoute")).TemplatesFlowRoute,
}));
const TemplatesRoute = lazy(async () => ({
	default: (await import("./TemplatesRoute")).TemplatesRoute,
}));
const ToolsRoute = lazy(async () => ({ default: (await import("./ToolsRoute")).ToolsRoute }));
const WorkspaceRoute = lazy(async () => ({
	default: (await import("./WorkspaceRoute")).WorkspaceRoute,
}));

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
				<Route path={appRoute.toolsDiagnostics.slice(1)} element={<DiagnosticsRoute />} />
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
