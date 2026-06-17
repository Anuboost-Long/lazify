import type { TemplateBlueprint } from "@renderer/shared/ui/project-tree/types";

export const templateBlueprints: Record<string, TemplateBlueprint> = {
  "expo-default": {
    rootFiles: ["package.json"],
    // Expo (create-expo-app) now scaffolds source into a `src/` directory, so the
    // configured Lazify structure is nested under `src/` to replace it cleanly.
    folders: [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "@types",
            type: "folder",
            children: [
              {
                name: "assets",
                type: "folder",
                children: [{ name: "index.d.ts", type: "file" }]
              }
            ]
          },
          {
            name: "app",
            type: "folder",
            children: [
              { name: "_layout.tsx", type: "file" },
              { name: "index.tsx", type: "file" }
            ]
          },
          {
            name: "api",
            type: "folder",
            children: [{ name: "store.ts", type: "file" }]
          },
          {
            name: "assets",
            type: "folder",
            children: [
              { name: "fonts", type: "folder" },
              { name: "images", type: "folder" },
              {
                name: "icons",
                type: "folder",
                children: [{ name: "logo.tsx", type: "file" }]
              }
            ]
          },
          {
            name: "components",
            type: "folder",
            children: [
              {
                name: "versioning",
                type: "folder",
                children: [{ name: "versioning-controller.tsx", type: "file" }]
              }
            ]
          },
          {
            name: "core",
            type: "folder",
            children: [
              {
                name: "theme",
                type: "folder",
                children: [
                  { name: "colors.ts", type: "file" },
                  { name: "theme-context.ts", type: "file" },
                  { name: "theme-provider.tsx", type: "file" },
                  { name: "theme-types.ts", type: "file" }
                ]
              }
            ]
          },
          {
            name: "hooks",
            type: "folder",
            children: [{ name: "use-theme.ts", type: "file" }]
          },
          {
            name: "navigation",
            type: "folder",
            children: [{ name: "root-navigation.tsx", type: "file" }]
          }
        ]
      }
    ]
  },
  "next-default": {
    rootFiles: ["package.json", "next.config.js"],
    folders: [
      {
        name: "app",
        type: "folder",
        children: [
          { name: "globals.css", type: "file" },
          { name: "layout.tsx", type: "file" },
          { name: "page.tsx", type: "file" },
          {
            name: "[locale]",
            type: "folder",
            children: [
              { name: "layout.tsx", type: "file" },
              { name: "page.tsx", type: "file" },
              {
                name: "dashboard",
                type: "folder",
                children: [{ name: "page.tsx", type: "file" }]
              },
              {
                name: "settings",
                type: "folder",
                children: [{ name: "page.tsx", type: "file" }]
              }
            ]
          }
        ]
      },
      {
        name: "components",
        type: "folder",
        children: [
          {
            name: "navigation",
            type: "folder",
            children: [
              { name: "app-shell.tsx", type: "file" },
              { name: "nav-link.tsx", type: "file" }
            ]
          },
          {
            name: "shared",
            type: "folder",
            children: [
              { name: "i18n-provider.tsx", type: "file" },
              { name: "locale-switcher.tsx", type: "file" }
            ]
          }
        ]
      },
      {
        name: "i18n",
        type: "folder",
        children: [{ name: "config.ts", type: "file" }]
      },
      {
        name: "lib",
        type: "folder",
        children: [
          { name: "navigation.ts", type: "file" },
          { name: "utils.ts", type: "file" }
        ]
      },
      {
        name: "messages",
        type: "folder",
        children: [
          { name: "en.json", type: "file" },
          { name: "km.json", type: "file" }
        ]
      },
      {
        name: "store",
        type: "folder",
        children: [{ name: "app-store.ts", type: "file" }]
      },
      {
        name: "types",
        type: "folder",
        children: [{ name: "navigation.ts", type: "file" }]
      },
      {
        name: "public",
        type: "folder",
        children: [
          { name: "favicon.ico", type: "file" },
          { name: "vercel.svg", type: "file" }
        ]
      }
    ]
  },
  "vite-react": {
    rootFiles: ["package.json", "vite.config.ts", "tsconfig.json"],
    folders: [
      {
        name: "public",
        type: "folder",
        children: [{ name: "vite.svg", type: "file" }]
      },
      {
        name: "src",
        type: "folder",
        children: [
          { name: "main.tsx", type: "file" },
          { name: "App.tsx", type: "file" },
          { name: "index.css", type: "file" }
        ]
      }
    ]
  },
  "react-native-bare": {
    rootFiles: ["package.json", "babel.config.js", "metro.config.js"],
    folders: [
      {
        name: "android",
        type: "folder",
        children: [
          { name: "app", type: "folder" },
          { name: "gradle", type: "folder" }
        ]
      },
      {
        name: "ios",
        type: "folder",
        children: [
          { name: "AppDelegate.mm", type: "file" },
          { name: "Info.plist", type: "file" }
        ]
      },
      {
        name: "__tests__",
        type: "folder",
        children: [{ name: "App.test.tsx", type: "file" }]
      }
    ]
  }
};
