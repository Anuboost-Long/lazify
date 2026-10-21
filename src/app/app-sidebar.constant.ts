import type { UiIconName } from "@/shared/ui/icons/UiIcon";
import { appRoute } from "./app-routes";
import { translation } from "@/i18n/translation";
import type { ShortcutId } from "@/shared/lib/shortcuts";

export type AppPageId = "home" | "workspace" | "agents" | "browser" | "templates" | "settings" | "tools";

export interface AppPageLink {
  id: AppPageId;
  path: string;
  label: string;
  description: string;
  icon: UiIconName;
  color: string;
  shortcut?: ShortcutId;
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
    color: "var(--color-accent)",
    shortcut: "go-home",
  },
  {
    id: "workspace",
    path: appRoute.workspace,
    label: translation.Navigation.Workspace,
    description: translation.Navigation.WorkspaceDesc,
    icon: "folder",
    color: "#f0a02c",
    shortcut: "go-workspace",
  },
  {
    id: "agents",
    path: appRoute.agents,
    label: translation.Navigation.Agents,
    description: translation.Navigation.AgentsDesc,
    icon: "code",
    color: "#7c5cff",
    shortcut: "go-agents",
  },
  {
    id: "browser",
    path: appRoute.browser,
    label: translation.Navigation.Browser,
    description: translation.Navigation.BrowserDesc,
    icon: "globe",
    color: "#2f7df4",
    shortcut: "go-browser",
  },
  {
    id: "templates",
    path: appRoute.templates,
    label: translation.Navigation.Templates,
    description: translation.Navigation.TemplatesDesc,
    icon: "package",
    color: "#e5528c",
    shortcut: "go-templates",
  },
  {
    id: "settings",
    path: appRoute.settings,
    label: translation.Navigation.Settings,
    description: translation.Navigation.SettingsDesc,
    icon: "settings",
    color: "var(--color-muted)",
    shortcut: "open-settings",
  },
  {
    id: "tools",
    path: appRoute.tools,
    label: translation.Navigation.Tools,
    description: translation.Navigation.ToolsDesc,
    icon: "tools",
    color: "#00b8a9",
    shortcut: "go-tools",
  },
];
