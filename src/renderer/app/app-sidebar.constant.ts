import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { appRoute } from "./app-routes";
import { translation } from "@renderer/i18n/translation";

export type AppPageId = "home" | "workspace" | "agents" | "browser" | "templates" | "settings" | "tools";

export interface AppPageLink {
  id: AppPageId;
  path: string;
  label: string;
  description: string;
  icon: UiIconName;
  /** Only offered on macOS — the page needs tools no other OS has. */
  macOnly?: boolean;
}

export const appSidebarPages: AppPageLink[] = [
  {
    id: "home",
    path: appRoute.home,
    label: translation.Navigation.Home,
    description: translation.Navigation.HomeDesc,
    icon: "home",
  },
  {
    id: "workspace",
    path: appRoute.workspace,
    label: translation.Navigation.Workspace,
    description: translation.Navigation.WorkspaceDesc,
    icon: "folder",
  },
  {
    id: "agents",
    path: appRoute.agents,
    label: translation.Navigation.Agents,
    description: translation.Navigation.AgentsDesc,
    icon: "code",
  },
  {
    id: "browser",
    path: appRoute.browser,
    label: translation.Navigation.Browser,
    description: translation.Navigation.BrowserDesc,
    icon: "globe",
  },
  {
    id: "templates",
    path: appRoute.templates,
    label: translation.Navigation.Templates,
    description: translation.Navigation.TemplatesDesc,
    icon: "package",
  },
  {
    id: "settings",
    path: appRoute.settings,
    label: translation.Navigation.Settings,
    description: translation.Navigation.SettingsDesc,
    icon: "settings",
  },
  {
    id: "tools",
    path: appRoute.tools,
    label: translation.Navigation.Tools,
    description: translation.Navigation.ToolsDesc,
    icon: "tools",
  },
];
