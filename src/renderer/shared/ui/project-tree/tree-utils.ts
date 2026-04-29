import { structureOptions } from "@renderer/shared/ui/project-tree/constants/structure-options";
import { templateBlueprints } from "@renderer/shared/ui/project-tree/constants/template-blueprints";
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
    if (normalizedName === "package.json") {
      return `{\n  "name": "project-name",\n  "main": "expo-router/entry",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "start": "expo start --clear",\n    "reset-project": "node ./scripts/reset-project.js",\n    "android": "expo run:android",\n    "ios": "expo run:ios",\n    "web": "expo start --web",\n    "test": "jest --watchAll",\n    "lint": "expo lint",\n    "fix": "npx expo install --fix",\n    "make-language": "node ./scripts/make-language.ts",\n    "prebuild": "npx expo prebuild --clean ",\n    "build:apk": "cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..",\n    "preview:all": "eas build --profile preview",\n    "preview:android": "eas build --platform android --profile preview",\n    "preview:ios": "eas build --platform ios --profile preview",\n    "prod:android": "eas build --platform android --profile production",\n    "prod:ios": "eas build --platform ios --profile production",\n    "dev:ios": "eas build --platform ios --profile development",\n    "dev:android": "eas build --platform android --profile development",\n    "update:preview": "eas update --branch preview --message",\n    "update:production": "eas update --branch production --message",\n    "submit:ios": "eas submit --platform ios",\n    "submit:android": "eas submit --platform android",\n    "build:version:set": "eas build:version:set --platform ios"\n  },\n  "dependencies": {\n    "expo": "^54.0.33",\n    "expo-build-properties": "~1.0.10",\n    "expo-font": "~14.0.11",\n    "expo-router": "~6.0.23",\n    "expo-status-bar": "~3.0.9",\n    "expo-web-browser": "~15.0.10",\n    "jotai": "^2.10.0",\n    "react": "19.1.0",\n    "react-native": "0.81.5",\n    "react-native-safe-area-context": "~5.6.0",\n    "react-native-svg": "15.12.1"\n  },\n  "devDependencies": {\n    "@babel/core": "^7.20.0",\n    "@types/react": "~19.1.10",\n    "react-native-svg-transformer": "^1.1.0",\n    "typescript": "~5.9.2"\n  }\n}\n`;
    }

    if (normalizedName === "app.config.js") {
      return `export default ({ config }) => ({\n  ...config,\n  name: "Project Name",\n  slug: "project-name",\n  scheme: "project-name",\n  version: "1.0.0",\n  orientation: "portrait",\n  userInterfaceStyle: "automatic",\n  ios: {\n    ...config.ios,\n    supportsTablet: true\n  },\n  android: {\n    ...config.android,\n    adaptiveIcon: {\n      foregroundImage: "./assets/images/adaptive-icon.png",\n      backgroundColor: "#6F2B90"\n    }\n  },\n  web: {\n    bundler: "metro",\n    output: "static"\n  },\n  plugins: [\n    [\n      "expo-build-properties",\n      {\n        ios: {\n          useFrameworks: "static"\n        }\n      }\n    ],\n    "expo-router",\n    "expo-font",\n    "expo-web-browser"\n  ],\n  experiments: {\n    typedRoutes: true\n  },\n  extra: {\n    router: {\n      origin: false\n    }\n  }\n})\n`;
    }

    if (normalizedName === "tsconfig.json") {
      return `{\n  "extends": "expo/tsconfig.base",\n  "compilerOptions": {\n    "strict": true,\n    "baseUrl": ".",\n    "paths": {\n      "@/*": [\n        "./*"\n      ]\n    }\n  },\n  "include": [\n    "**/*.ts",\n    "**/*.tsx",\n    ".expo/types/**/*.ts",\n    "expo-env.d.ts"\n  ]\n}\n`;
    }

    if (normalizedName === "babel.config.js") {
      return `module.exports = function (api) {\n  api.cache(true)\n\n  return {\n    presets: ["babel-preset-expo"]\n  }\n}\n`;
    }

    if (normalizedName === "metro.config.js") {
      return `const { getDefaultConfig } = require("expo/metro-config")\n\nmodule.exports = (() => {\n  const config = getDefaultConfig(__dirname)\n  const { transformer, resolver } = config\n\n  config.transformer = {\n    ...transformer,\n    babelTransformerPath: require.resolve("react-native-svg-transformer")\n  }\n\n  config.resolver = {\n    ...resolver,\n    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),\n    sourceExts: [...resolver.sourceExts, "svg"]\n  }\n\n  return config\n})()\n`;
    }

    if (normalizedName === "expo-env.d.ts") {
      return `/// <reference types="expo/types" />\n\n// NOTE: This file should not be edited and should be in your git ignore\n`;
    }

    if (normalizedName === "eas.json") {
      return `{\n  "cli": {\n    "version": ">= 14.2.0",\n    "appVersionSource": "remote"\n  },\n  "build": {\n    "development": {\n      "developmentClient": true,\n      "distribution": "internal"\n    },\n    "preview": {\n      "distribution": "store"\n    },\n    "production": {}\n  },\n  "submit": {\n    "production": {},\n    "preview": {}\n  }\n}\n`;
    }

    if (normalizedName === ".gitignore") {
      return `node_modules/\n.expo/\ndist/\nnpm-debug.*\n*.jks\n*.p8\n*.p12\n*.key\n*.mobileprovision\n*.orig.*\nweb-build/\n\n# macOS\n.DS_Store\n\n# @generated expo-cli\n.env\nexpo-env.d.ts\n`;
    }

    if (normalizedName === ".eslintrc.js") {
      return `module.exports = {\n  extends: ["expo", "prettier"],\n  plugins: ["simple-import-sort", "prettier"],\n  root: true,\n  rules: {\n    "simple-import-sort/imports": "error",\n    "prettier/prettier": "error",\n    "sort-imports": "error"\n  }\n}\n`;
    }

    if (normalizedPath === "app/_layout.tsx") {
      return `import { Provider } from "jotai"\nimport { StatusBar } from "expo-status-bar"\nimport { useColorScheme } from "react-native"\nimport { DarkTheme, LightTheme } from "@/core/theme/colors"\nimport ThemeProvider from "@/core/theme/theme-provider"\nimport RootNavigation from "@/navigation/root-navigation"\nimport VersioningController from "@/components/versioning/versioning-controller"\nimport store from "@/api/store"\n\nexport default function Layout() {\n  const colorScheme = useColorScheme()\n\n  return (\n    <ThemeProvider value={colorScheme === "light" ? LightTheme : DarkTheme}>\n      <Provider store={store}>\n        <VersioningController />\n        <StatusBar style={"auto"} />\n        <RootNavigation />\n      </Provider>\n    </ThemeProvider>\n  )\n}\n`;
    }

    if (normalizedPath === "app/index.tsx") {
      return `import React from "react"\nimport { StyleSheet, Text, View } from "react-native"\nimport useTheme from "@/core/theme/theme-context"\n\nexport default function Index() {\n  const theme = useTheme()\n\n  return (\n    <View style={[styles.container, { backgroundColor: theme.colors.BackGround }]}>\n      <Text style={[styles.title, { color: theme.colors.Text }]}>Infinity Mobile App</Text>\n      <Text style={[styles.subtitle, { color: theme.colors.Inactive }]}>Expo starter scaffold powered by Lazify.</Text>\n    </View>\n  )\n}\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    alignItems: "center",\n    justifyContent: "center",\n    paddingHorizontal: 24\n  },\n  title: {\n    fontSize: 28,\n    fontWeight: "700"\n  },\n  subtitle: {\n    marginTop: 12,\n    fontSize: 15,\n    textAlign: "center"\n  }\n})\n`;
    }

    if (normalizedPath === "api/store.ts") {
      return `import { createStore } from "jotai"\n\nconst store = createStore()\n\nexport default store\n`;
    }

    if (normalizedPath === "navigation/root-navigation.tsx") {
      return `import React from "react"\nimport { Stack } from "expo-router"\nimport useTheme from "@/core/theme/theme-context"\n\nexport default function RootNavigation() {\n  const theme = useTheme()\n\n  return (\n    <Stack\n      screenOptions={{\n        headerShown: false,\n        contentStyle: {\n          backgroundColor: theme.colors.BackGround,\n          flex: 1\n        }\n      }}\n    >\n      <Stack.Screen name="index" />\n    </Stack>\n  )\n}\n`;
    }

    if (normalizedPath === "components/versioning/versioning-controller.tsx") {
      return `import React from "react"\n\nexport default function VersioningController() {\n  return null\n}\n`;
    }

    if (normalizedPath === "core/theme/colors.ts") {
      return `import { Theme } from "@/core/theme/theme-types"\n\nexport const LightTheme: Theme = {\n  isDark: false,\n  colors: {\n    Primary: "#6F2B90",\n    PrimaryAscent: "rgba(111,43,144,0.2)",\n    White: "#FFFFFF",\n    Inactive: "#6B7280",\n    InactiveAscent: "rgba(107,114,128,0.2)",\n    Active: "#6F2B90",\n    ActivePrime: "#6F2B90",\n    BackGround: "#FFFFFF",\n    BackGroundLight: "#FEFEFE",\n    Alert: "#dc2626",\n    Text: "#000000",\n    BgBlur: "rgba(255,255,255,0.5)",\n    BackDrop: "rgba(0,0,0,0.4)",\n    Outline: "rgba(0,0,0,0.05)",\n    Border: "rgba(17,24,39,0.08)",\n    Orange: "#F47521",\n    OrangeAscent: "rgba(244,117,33,0.2)",\n    LimeGreen: "#059033",\n    GreenAscent: "rgba(5,144,51,0.2)",\n    Gold: "#D4AF37",\n    Silver: "#C0C0C0",\n    Yellow: "#FFF21F",\n    PBgBlur: "rgba(255,255,255,0.8)",\n    Bronze: "#CD7F32"\n  }\n}\n\nexport const DarkTheme: Theme = {\n  isDark: true,\n  colors: {\n    Primary: "#6F2B90",\n    PrimaryAscent: "rgba(111,43,144,0.2)",\n    White: "#FFFFFF",\n    Inactive: "#ADADAD",\n    InactiveAscent: "rgba(173,173,173,0.2)",\n    Active: "#FFFFFF",\n    ActivePrime: "#F47521",\n    BackGround: "#111827",\n    BackGroundLight: "#1f2937",\n    Alert: "#dc2626",\n    Text: "#f3f4f6",\n    BgBlur: "rgba(0,0,0,0.5)",\n    BackDrop: "rgba(0,0,0,0.4)",\n    Outline: "rgba(255,255,255,0.05)",\n    Border: "rgba(255,255,255,0.08)",\n    Orange: "#F47521",\n    OrangeAscent: "rgba(244,117,33,0.1)",\n    LimeGreen: "#059033",\n    GreenAscent: "rgba(5,144,51,0.2)",\n    Gold: "#D4AF37",\n    Silver: "#C0C0C0",\n    Yellow: "#FFF21F",\n    PBgBlur: "rgba(17, 24, 39, 0.1)",\n    Bronze: "#CD7F32"\n  }\n}\n`;
    }

    if (normalizedPath === "core/theme/theme-provider.tsx") {
      return `import React, { createContext } from "react"\nimport { LightTheme } from "@/core/theme/colors"\nimport { Theme } from "@/core/theme/theme-types"\n\nexport const ThemeContext = createContext<Theme>(LightTheme)\n\nexport default function ThemeProvider({\n  value,\n  children\n}: Readonly<{\n  value: Theme\n  children: React.ReactNode\n}>) {\n  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>\n}\n`;
    }

    if (normalizedPath === "core/theme/theme-context.ts") {
      return `import { useContext } from "react"\nimport { ThemeContext } from "@/core/theme/theme-provider"\n\nexport default function useTheme() {\n  return useContext(ThemeContext)\n}\n`;
    }

    if (normalizedPath === "core/theme/theme-types.ts") {
      return `export type Theme = {\n  isDark: boolean\n  colors: ThemeColors\n}\n\nexport type ThemeColors = {\n  Primary: string\n  PrimaryAscent: string\n  White: string\n  Inactive: string\n  InactiveAscent: string\n  Active: string\n  ActivePrime: string\n  BackGround: string\n  BackGroundLight: string\n  Alert: string\n  Text: string\n  BgBlur: string\n  BackDrop: string\n  Outline: string\n  Border: string\n  Orange: string\n  OrangeAscent: string\n  LimeGreen: string\n  GreenAscent: string\n  Gold: string\n  Silver: string\n  Yellow: string\n  PBgBlur: string\n  Bronze: string\n}\n`;
    }

    if (normalizedPath === "@types/assets/index.d.ts") {
      return `declare module "*.svg" {\n  import type React from "react"\n  import type { SvgProps } from "react-native-svg"\n\n  const content: React.FC<SvgProps>\n  export default content\n}\n`;
    }
  }

  if (normalizedName === "package.json") {
    return `{\n  "name": "project-name",\n  "version": "0.1.0",\n  "private": true\n}\n`;
  }

  if (normalizedName === "tsconfig.json") {
    return `{\n  "compilerOptions": {\n    "strict": true\n  }\n}\n`;
  }

  if (normalizedName === "app.json") {
    return `{\n  "expo": {\n    "name": "project-name",\n    "slug": "project-name"\n  }\n}\n`;
  }

  if (normalizedName === "next.config.js") {
    return `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nmodule.exports = nextConfig;\n`;
  }

  if (normalizedName === "vite.config.ts") {
    return `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()]\n});\n`;
  }

  if (normalizedName === "babel.config.js") {
    return `module.exports = {\n  presets: ["module:@react-native/babel-preset"]\n};\n`;
  }

  if (normalizedName === "metro.config.js") {
    return `const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");\n\nmodule.exports = mergeConfig(getDefaultConfig(__dirname), {});\n`;
  }

  if (
    normalizedName.endsWith(".svg") ||
    normalizedName.endsWith(".ico") ||
    normalizedName.endsWith(".plist") ||
    normalizedName.endsWith(".mm")
  ) {
    return "Preview unavailable for this generated asset file.\n";
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

  const moduleFolders = structureOptions
    .filter((option) => selectedStructurePaths.includes(option.path))
    .filter((option) => !blueprint.folders.some((folder) => folder.name === option.path))
    .map((option) =>
      createFolderNode(
        option.path,
        option.files.map<TemplateBlueprintEntry>((entry) => ({
          name: entry.endsWith("/") ? entry.slice(0, -1) : entry,
          type: entry.endsWith("/") ? "folder" : "file"
        })),
        "module",
        false,
        templateId
      )
    );

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

    const customChildren = match.children.filter((child) => child.source === "custom");
    const mergedChildren = mergeTrees(node.children, match.children);

    return {
      ...node,
      children: [...mergedChildren, ...customChildren]
    };
  });

  const customNodes: TreeNode[] = existing.filter((node): node is TreeNode => node.source === "custom");

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
