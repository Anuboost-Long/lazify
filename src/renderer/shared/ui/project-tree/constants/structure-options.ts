import type { StructureOption } from "@renderer/shared/ui/project-tree/types";

export const structureOptions: StructureOption[] = [
  {
    path: "app",
    label: "App routes",
    description: "Route entrypoints and screen-level views.",
    files: ["layout.tsx", "page.tsx", "providers.tsx"]
  },
  {
    path: "components",
    label: "Components",
    description: "Reusable UI building blocks and shared shells.",
    files: ["ui/button.tsx", "navigation/sidebar.tsx"]
  },
  {
    path: "lib",
    label: "Lib utilities",
    description: "Helpers, API clients, and common utilities.",
    files: ["utils.ts", "api.ts"]
  },
  {
    path: "hooks",
    label: "Hooks",
    description: "Shared React hooks for stateful workflows.",
    files: ["use-project.ts", "use-theme.ts"]
  },
  {
    path: "features",
    label: "Features",
    description: "Domain slices grouped by capability or screen.",
    files: ["auth/", "dashboard/", "settings/"]
  },
  {
    path: "types",
    label: "Types",
    description: "Application-level TypeScript contracts.",
    files: ["index.ts", "api.ts"]
  }
];
