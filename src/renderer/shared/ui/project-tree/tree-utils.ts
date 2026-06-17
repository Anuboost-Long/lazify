import { structureOptions } from "@renderer/shared/ui/project-tree/constants/structure-options";
import { templateBlueprints } from "@renderer/shared/ui/project-tree/constants/template-blueprints";
import {
  EXPO_APP_CONFIG,
  EXPO_APP_INDEX,
  EXPO_APP_LAYOUT,
  EXPO_API_STORE,
  EXPO_ASSETS_TYPES,
  EXPO_BABEL_CONFIG,
  EXPO_EAS_JSON,
  EXPO_ESLINTRC,
  EXPO_ENV_DTS,
  EXPO_GITIGNORE,
  EXPO_LOGO,
  EXPO_METRO_CONFIG,
  EXPO_PACKAGE_JSON,
  EXPO_ROOT_NAVIGATION,
  EXPO_THEME_COLORS,
  EXPO_THEME_CONTEXT,
  EXPO_THEME_PROVIDER,
  EXPO_THEME_TYPES,
  EXPO_TSCONFIG,
  EXPO_USE_THEME,
  EXPO_VERSIONING_CONTROLLER
} from "@renderer/shared/ui/project-tree/constants/scaffold/expo-default";
import {
  NEXT_APP_LAYOUT,
  NEXT_APP_PAGE,
  NEXT_APP_SHELL,
  NEXT_APP_STORE,
  NEXT_CONFIG,
  NEXT_DASHBOARD_PAGE,
  NEXT_GLOBALS_CSS,
  NEXT_I18N_CONFIG,
  NEXT_I18N_PROVIDER,
  NEXT_LIB_NAVIGATION,
  NEXT_LIB_UTILS,
  NEXT_LOCALE_LAYOUT,
  NEXT_LOCALE_PAGE,
  NEXT_LOCALE_SWITCHER,
  NEXT_MESSAGES_EN,
  NEXT_MESSAGES_KM,
  NEXT_NAV_LINK,
  NEXT_PACKAGE_JSON,
  NEXT_SETTINGS_PAGE,
  NEXT_TYPES_NAVIGATION
} from "@renderer/shared/ui/project-tree/constants/scaffold/next-default";
import {
  SHARED_APP_JSON,
  SHARED_ASSET_PLACEHOLDER,
  SHARED_BABEL_CONFIG,
  SHARED_METRO_CONFIG,
  SHARED_NEXT_CONFIG,
  SHARED_PACKAGE_JSON,
  SHARED_TSCONFIG,
  SHARED_VITE_CONFIG
} from "@renderer/shared/ui/project-tree/constants/scaffold/shared";
import type { TemplateBlueprintEntry, TreeNode } from "@renderer/shared/ui/project-tree/types";

export function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function toComponentName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const cleaned = baseName.replace(/[^a-zA-Z0-9]+/g, " ").trim();

  if (!cleaned) {
    return "Component";
  }

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function isFolderEntry(name: string) {
  return name.endsWith("/");
}

export function getDefaultFileContent(name: string, templateId?: string, fullPath = name) {
  const normalizedName = name.toLowerCase();
  const normalizedPath = fullPath.toLowerCase();

  if (templateId === "expo-default") {
    // Expo source folders are nested under `src/`; match against the path
    // relative to that directory so the existing keys stay readable.
    const relativePath = normalizedPath.startsWith("src/")
      ? normalizedPath.slice("src/".length)
      : normalizedPath;

    if (normalizedName === "package.json")                                   return EXPO_PACKAGE_JSON;
    if (normalizedName === "app.config.js")                                  return EXPO_APP_CONFIG;
    if (normalizedName === "tsconfig.json")                                  return EXPO_TSCONFIG;
    if (normalizedName === "babel.config.js")                                return EXPO_BABEL_CONFIG;
    if (normalizedName === "metro.config.js")                                return EXPO_METRO_CONFIG;
    if (normalizedName === "expo-env.d.ts")                                  return EXPO_ENV_DTS;
    if (normalizedName === "eas.json")                                       return EXPO_EAS_JSON;
    if (normalizedName === ".gitignore")                                     return EXPO_GITIGNORE;
    if (normalizedName === ".eslintrc.js")                                   return EXPO_ESLINTRC;
    if (relativePath === "app/_layout.tsx")                                  return EXPO_APP_LAYOUT;
    if (relativePath === "app/index.tsx")                                    return EXPO_APP_INDEX;
    if (relativePath === "api/store.ts")                                     return EXPO_API_STORE;
    if (relativePath === "assets/icons/logo.tsx")                            return EXPO_LOGO;
    if (relativePath === "hooks/use-theme.ts")                               return EXPO_USE_THEME;
    if (relativePath === "navigation/root-navigation.tsx")                   return EXPO_ROOT_NAVIGATION;
    if (relativePath === "components/versioning/versioning-controller.tsx")  return EXPO_VERSIONING_CONTROLLER;
    if (relativePath === "core/theme/colors.ts")                            return EXPO_THEME_COLORS;
    if (relativePath === "core/theme/theme-provider.tsx")                   return EXPO_THEME_PROVIDER;
    if (relativePath === "core/theme/theme-context.ts")                     return EXPO_THEME_CONTEXT;
    if (relativePath === "core/theme/theme-types.ts")                       return EXPO_THEME_TYPES;
    if (relativePath === "@types/assets/index.d.ts")                        return EXPO_ASSETS_TYPES;
  }

  if (templateId === "next-default") {
    if (normalizedName === "package.json")                                   return NEXT_PACKAGE_JSON;
    if (normalizedName === "favicon.ico" || normalizedName === "vercel.svg") return SHARED_ASSET_PLACEHOLDER;
    if (normalizedPath === "next.config.js")                                 return NEXT_CONFIG;
    if (normalizedPath === "app/layout.tsx")                                 return NEXT_APP_LAYOUT;
    if (normalizedPath === "app/page.tsx")                                   return NEXT_APP_PAGE;
    if (normalizedPath === "app/globals.css")                                return NEXT_GLOBALS_CSS;
    if (normalizedPath === "app/[locale]/layout.tsx")                        return NEXT_LOCALE_LAYOUT;
    if (normalizedPath === "app/[locale]/page.tsx")                          return NEXT_LOCALE_PAGE;
    if (normalizedPath === "app/[locale]/dashboard/page.tsx")                return NEXT_DASHBOARD_PAGE;
    if (normalizedPath === "app/[locale]/settings/page.tsx")                 return NEXT_SETTINGS_PAGE;
    if (normalizedPath === "components/navigation/app-shell.tsx")            return NEXT_APP_SHELL;
    if (normalizedPath === "components/navigation/nav-link.tsx")             return NEXT_NAV_LINK;
    if (normalizedPath === "components/shared/i18n-provider.tsx")            return NEXT_I18N_PROVIDER;
    if (normalizedPath === "components/shared/locale-switcher.tsx")          return NEXT_LOCALE_SWITCHER;
    if (normalizedPath === "i18n/config.ts")                                 return NEXT_I18N_CONFIG;
    if (normalizedPath === "lib/navigation.ts")                              return NEXT_LIB_NAVIGATION;
    if (normalizedPath === "lib/utils.ts")                                   return NEXT_LIB_UTILS;
    if (normalizedPath === "store/app-store.ts")                             return NEXT_APP_STORE;
    if (normalizedPath === "types/navigation.ts")                            return NEXT_TYPES_NAVIGATION;
    if (normalizedPath === "messages/en.json")                               return NEXT_MESSAGES_EN;
    if (normalizedPath === "messages/km.json")                               return NEXT_MESSAGES_KM;
  }

  if (normalizedName === "package.json")   return SHARED_PACKAGE_JSON;
  if (normalizedName === "tsconfig.json")  return SHARED_TSCONFIG;
  if (normalizedName === "app.json")       return SHARED_APP_JSON;
  if (normalizedName === "next.config.js") return SHARED_NEXT_CONFIG;
  if (normalizedName === "vite.config.ts") return SHARED_VITE_CONFIG;
  if (normalizedName === "babel.config.js") return SHARED_BABEL_CONFIG;
  if (normalizedName === "metro.config.js") return SHARED_METRO_CONFIG;

  if (
    normalizedName.endsWith(".svg") ||
    normalizedName.endsWith(".ico") ||
    normalizedName.endsWith(".plist") ||
    normalizedName.endsWith(".mm")
  ) {
    return SHARED_ASSET_PLACEHOLDER;
  }

  if (name.endsWith(".tsx")) {
    const componentName = toComponentName(name);

    if (templateId === "expo-default" || templateId === "react-native-bare") {
      return `import { StyleSheet, Text, View } from 'react-native'\nimport React from 'react'\n\nexport default function ${componentName}() {\n  return (\n    <View>\n      <Text>${componentName}</Text>\n    </View>\n  )\n}\n\nconst styles = StyleSheet.create({})\n`;
    }

    if (templateId === "next-default" || templateId === "vite-react") {
      return `import React from 'react'\n\nconst ${componentName} = () => {\n  return (\n    <div>${componentName}</div>\n  )\n}\n\nexport default ${componentName}\n`;
    }

    return `export default function ${componentName}() {\n  return <></>;\n}\n`;
  }

  if (name.endsWith(".ts")) {
    return "export {};\n";
  }

  if (name.endsWith(".json")) {
    return "{\n  \n}\n";
  }

  if (name.endsWith(".css")) {
    return ":root {\n  \n}\n";
  }

  if (name.endsWith(".md")) {
    return `# ${name.replace(/\.[^.]+$/, "")}\n`;
  }

  return "";
}

export function createNode(
  name: string,
  type: "file" | "folder",
  source: TreeNode["source"],
  locked: boolean,
  children: TreeNode[] = [],
  seed?: string,
  content?: string
): TreeNode {
  return {
    id: seed ?? `${source}-${type}-${slug(name)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    source,
    locked,
    content,
    children
  };
}

export function createFolderNode(
  name: string,
  entries: TemplateBlueprintEntry[],
  source: TreeNode["source"],
  locked: boolean,
  templateId?: string,
  parentPath = ""
): TreeNode {
  const currentPath = parentPath ? `${parentPath}/${name}` : name;
  const children: TreeNode[] = entries.map((entry): TreeNode =>
    entry.type === "folder"
      ? createFolderNode(entry.name, entry.children ?? [], source, locked, templateId, currentPath)
      : createNode(
          entry.name,
          "file",
          source,
          locked,
          [],
          `${source}-file-${slug(currentPath)}-${slug(entry.name)}`,
          getDefaultFileContent(entry.name, templateId, `${currentPath}/${entry.name}`)
        )
  );

  return createNode(name, "folder", source, locked, children, `${source}-folder-${slug(currentPath)}`);
}

export function buildBaselineTree(templateId: string, selectedStructurePaths: string[]) {
  const blueprint = templateBlueprints[templateId] ?? {
    rootFiles: ["package.json", "README.md", "tsconfig.json"],
    folders: []
  };

  const rootFiles = blueprint.rootFiles.map((file) =>
    createNode(
      file,
      "file",
      "cli",
      true,
      [],
      `cli-root-${slug(file)}`,
      getDefaultFileContent(file, templateId, file)
    )
  );

  const cliFolders = blueprint.folders.map((folder) =>
    createFolderNode(folder.name, folder.children ?? [], "cli", true, templateId)
  );

  // Expo nests its configured structure under `src/`, so user-selected module
  // folders must be created inside that directory too (not at the project root).
  const sourceDir = templateId === "expo-default" ? "src" : null;
  const blueprintFolderNames = sourceDir
    ? (blueprint.folders.find((folder) => folder.name === sourceDir)?.children ?? []).map(
        (child) => child.name
      )
    : blueprint.folders.map((folder) => folder.name);

  const moduleFolders = structureOptions
    .filter((option) => selectedStructurePaths.includes(option.path))
    .filter((option) => !blueprintFolderNames.includes(option.path))
    .map((option) =>
      createFolderNode(
        option.path,
        option.files.map<TemplateBlueprintEntry>((entry) => ({
          name: entry.endsWith("/") ? entry.slice(0, -1) : entry,
          type: entry.endsWith("/") ? "folder" : "file"
        })),
        "module",
        false,
        templateId,
        sourceDir ?? ""
      )
    );

  if (sourceDir) {
    const foldersWithModules = cliFolders.map((folder) =>
      folder.name === sourceDir
        ? { ...folder, children: [...folder.children, ...moduleFolders] }
        : folder
    );

    return [...rootFiles, ...foldersWithModules];
  }

  return [...rootFiles, ...cliFolders, ...moduleFolders];
}

export function mergeTrees(baseline: TreeNode[], existing: TreeNode[]) {
  const merged: TreeNode[] = baseline.map((node): TreeNode => {
    const match = existing.find(
      (candidate) =>
        candidate.name === node.name && candidate.type === node.type && candidate.source !== "custom"
    );

    if (!match || node.type === "file") {
      return node;
    }

    const mergedChildren = mergeTrees(node.children, match.children);

    return {
      ...node,
      children: mergedChildren
    };
  });

  const mergedIds = new Set(merged.map((node) => node.id));
  const customNodes: TreeNode[] = existing.filter(
    (node): node is TreeNode => {
      if (node.source !== "custom" || mergedIds.has(node.id)) {
        return false;
      }

      mergedIds.add(node.id);
      return true;
    }
  );

  return [...merged, ...customNodes];
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const nested = findNode(node.children, id);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function updateTree(nodes: TreeNode[], id: string, updater: (node: TreeNode) => TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater(node);
    }

    if (node.children.length === 0) {
      return node;
    }

    return {
      ...node,
      children: updateTree(node.children, id, updater)
    };
  });
}

export function removeFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeFromTree(node.children, id)
    }));
}

export function addChildNode(nodes: TreeNode[], parentId: string | null, child: TreeNode): TreeNode[] {
  if (parentId === null) {
    return [...nodes, child];
  }

  return updateTree(nodes, parentId, (node) => ({
    ...node,
    children: [...node.children, child]
  }));
}

export function findContainingFolderId(
  nodes: TreeNode[],
  targetId: string,
  parentFolderId: string | null = null
): string | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node.type === "folder" ? node.id : parentFolderId;
    }

    if (node.children.length > 0) {
      const nested = findContainingFolderId(
        node.children,
        targetId,
        node.type === "folder" ? node.id : parentFolderId
      );

      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

export function getNodePath(nodes: TreeNode[], id: string, parentPath = ""): string | null {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.id === id) {
      return currentPath;
    }

    const nested = getNodePath(node.children, id, currentPath);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function collectFolderIds(nodes: TreeNode[]) {
  const ids: string[] = [];

  for (const node of nodes) {
    if (node.type === "folder") {
      ids.push(node.id);
      ids.push(...collectFolderIds(node.children));
    }
  }

  return ids;
}

export function findFirstFileId(nodes: TreeNode[]): string | null {
  for (const node of nodes) {
    if (node.type === "file") {
      return node.id;
    }

    const nested = findFirstFileId(node.children);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}
