import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { appRoute } from "./app-routes";

export type AppPageId = "workspace" | "importProject" | "test" | "console" | "templates" | "settings";

export interface AppPageLink {
  id: AppPageId;
  path: string;
  label: string;
  description: string;
  icon: UiIconName;
}

export const appSidebarPages: AppPageLink[] = [
  {
    id: "workspace",
    path: appRoute.workspace,
    label: "Workspace",
    description: "Create apps and install packages.",
    icon: "folder",
  },
  {
    id: "importProject",
    path: appRoute.importProject,
    label: "Import Project",
    description: "Scan a local project folder into the tree viewer.",
    icon: "import",
  },
  {
    id: "test",
    path: appRoute.test,
    label: "Test",
    description: "Temporary project tree sandbox.",
    icon: "play",
  },
  {
    id: "console",
    path: appRoute.console,
    label: "Console",
    description: "Watch live command output.",
    icon: "terminal",
  },
  {
    id: "templates",
    path: appRoute.templates,
    label: "Templates",
    description: "Review imported project templates.",
    icon: "package",
  },
  {
    id: "settings",
    path: appRoute.settings,
    label: "Settings",
    description: "Inspect local runtime details.",
    icon: "settings",
  },
];
