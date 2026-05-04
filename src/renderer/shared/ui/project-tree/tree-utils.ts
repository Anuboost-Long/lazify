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
      return `const { getDefaultConfig } = require("expo/metro-config")\n\nmodule.exports = (() => {\n  const config = getDefaultConfig(__dirname)\n\n  const { transformer, resolver } = config\n\n  config.transformer = {\n    ...transformer,\n    babelTransformerPath: require.resolve(\n      "react-native-svg-transformer",\n      "react-native-dotenv"\n    )\n  }\n\n  config.resolver = {\n    ...resolver,\n    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),\n    sourceExts: [...resolver.sourceExts, "svg"]\n  }\n\n  return config\n})()\n`;
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

  if (templateId === "next-default") {
    if (normalizedName === "package.json") {
      return `{\n  "name": "infinity-admin",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start",\n    "lint": "next lint"\n  }\n}\n`;
    }

    if (normalizedPath === "next.config.js") {
      return `/** @type {import("next").NextConfig} */\nconst nextConfig = {}\n\nmodule.exports = nextConfig\n`;
    }

    if (normalizedPath === "app/layout.tsx") {
      return `import type { Metadata } from "next"\nimport type { ReactNode } from "react"\nimport "./globals.css"\n\nexport const metadata: Metadata = {\n  title: "Infinity Admin",\n  description: "Admin starter scaffold with routing, translations, and global state."\n}\n\nexport default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}\n`;
    }

    if (normalizedPath === "app/page.tsx") {
      return `import { redirect } from "next/navigation"\n\nexport default function RootPage() {\n  redirect("/en")\n}\n`;
    }

    if (normalizedPath === "app/globals.css") {
      return `:root {\n  --background: #f4f7fb;\n  --surface: #ffffff;\n  --surface-soft: #edf2f7;\n  --border: #d7e0ea;\n  --text: #102033;\n  --muted: #5c6c80;\n  --accent: #0f766e;\n  --accent-strong: #115e59;\n  --shadow: 0 24px 80px rgba(15, 23, 42, 0.08);\n}\n\n* {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  margin: 0;\n  min-height: 100%;\n  background: var(--background);\n  color: var(--text);\n  font-family: Arial, sans-serif;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\nbutton,\nselect {\n  font: inherit;\n}\n\nbody {\n  min-height: 100vh;\n}\n\n.shell {\n  display: grid;\n  min-height: 100vh;\n  grid-template-columns: 280px minmax(0, 1fr);\n}\n\n.sidebar {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  border-right: 1px solid var(--border);\n  background: linear-gradient(180deg, #0f172a 0%, #12243d 100%);\n  color: #f8fafc;\n  padding: 28px;\n}\n\n.sidebar-kicker {\n  margin: 0;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.18em;\n  text-transform: uppercase;\n  color: #5eead4;\n}\n\n.sidebar-title {\n  margin: 12px 0 0;\n  font-size: 28px;\n}\n\n.sidebar-copy {\n  margin: 12px 0 0;\n  color: rgba(248, 250, 252, 0.74);\n  line-height: 1.6;\n}\n\n.sidebar-nav {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.nav-link {\n  border: 1px solid transparent;\n  border-radius: 16px;\n  padding: 14px 16px;\n  color: rgba(248, 250, 252, 0.78);\n}\n\n.nav-link:hover,\n.nav-link-active {\n  border-color: rgba(94, 234, 212, 0.28);\n  background: rgba(255, 255, 255, 0.06);\n  color: #ffffff;\n}\n\n.shell-main {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n\n.shell-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n  border-bottom: 1px solid var(--border);\n  padding: 20px 28px;\n  background: rgba(255, 255, 255, 0.82);\n  backdrop-filter: blur(16px);\n}\n\n.toggle-button,\n.locale-switcher select {\n  border: 1px solid var(--border);\n  border-radius: 14px;\n  background: var(--surface);\n  color: var(--text);\n  padding: 10px 14px;\n}\n\n.locale-switcher {\n  display: inline-flex;\n  align-items: center;\n  gap: 12px;\n  color: var(--muted);\n}\n\n.shell-content {\n  padding: 28px;\n}\n\n.page-eyebrow {\n  display: inline-block;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.18em;\n  text-transform: uppercase;\n  color: var(--accent-strong);\n}\n\n.page-title {\n  margin: 12px 0 0;\n  font-size: clamp(32px, 4vw, 44px);\n  line-height: 1.05;\n}\n\n.page-copy {\n  max-width: 720px;\n  margin: 16px 0 0;\n  color: var(--muted);\n  line-height: 1.7;\n}\n\n.card-grid,\n.stats-grid {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 16px;\n  margin-top: 28px;\n}\n\n.card,\n.stat-card {\n  border: 1px solid var(--border);\n  border-radius: 24px;\n  background: var(--surface);\n  box-shadow: var(--shadow);\n  padding: 22px;\n}\n\n.card h2,\n.stat-card strong {\n  margin: 0;\n}\n\n.card p,\n.stat-card span {\n  display: block;\n  margin: 10px 0 0;\n  color: var(--muted);\n  line-height: 1.6;\n}\n\n.stat-card strong {\n  display: block;\n  margin-top: 14px;\n  font-size: 28px;\n  color: var(--text);\n}\n\n@media (max-width: 960px) {\n  .shell {\n    grid-template-columns: 1fr;\n  }\n\n  .sidebar {\n    border-right: 0;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  .card-grid,\n  .stats-grid {\n    grid-template-columns: 1fr;\n  }\n}\n`;
    }

    if (normalizedPath === "app/[locale]/layout.tsx") {
      return `import type { ReactNode } from "react"\nimport { notFound } from "next/navigation"\nimport { AppShell } from "@/components/navigation/app-shell"\nimport { I18nProvider } from "@/components/shared/i18n-provider"\nimport { appLocales } from "@/types/navigation"\n\nexport function generateStaticParams() {\n  return appLocales.map((locale) => ({ locale }))\n}\n\nexport default async function LocaleLayout({\n  children,\n  params\n}: Readonly<{\n  children: ReactNode\n  params: Promise<{ locale: string }> | { locale: string }\n}>) {\n  const { locale } = await Promise.resolve(params)\n\n  if (!appLocales.includes(locale as (typeof appLocales)[number])) {\n    notFound()\n  }\n\n  return (\n    <I18nProvider locale={locale}>\n      <AppShell locale={locale}>{children}</AppShell>\n    </I18nProvider>\n  )\n}\n`;
    }

    if (normalizedPath === "app/[locale]/page.tsx") {
      return `"use client"\n\nimport { useTranslation } from "react-i18next"\n\nexport default function HomePage() {\n  const { t } = useTranslation()\n\n  return (\n    <section>\n      <span className="page-eyebrow">{t("HomePage.eyebrow")}</span>\n      <h1 className="page-title">{t("HomePage.title")}</h1>\n      <p className="page-copy">{t("HomePage.description")}</p>\n\n      <div className="card-grid">\n        <article className="card">\n          <h2>{t("HomePage.cards.routing.title")}</h2>\n          <p>{t("HomePage.cards.routing.description")}</p>\n        </article>\n        <article className="card">\n          <h2>{t("HomePage.cards.translation.title")}</h2>\n          <p>{t("HomePage.cards.translation.description")}</p>\n        </article>\n        <article className="card">\n          <h2>{t("HomePage.cards.state.title")}</h2>\n          <p>{t("HomePage.cards.state.description")}</p>\n        </article>\n      </div>\n    </section>\n  )\n}\n`;
    }

    if (normalizedPath === "app/[locale]/dashboard/page.tsx") {
      return `"use client"\n\nimport { useTranslation } from "react-i18next"\n\nexport default function DashboardPage() {\n  const { t } = useTranslation()\n\n  return (\n    <section>\n      <span className="page-eyebrow">{t("DashboardPage.eyebrow")}</span>\n      <h1 className="page-title">{t("DashboardPage.title")}</h1>\n      <p className="page-copy">{t("DashboardPage.description")}</p>\n\n      <div className="stats-grid">\n        <article className="stat-card">\n          <span>{t("DashboardPage.metrics.revenue.label")}</span>\n          <strong>{t("DashboardPage.metrics.revenue.value")}</strong>\n        </article>\n        <article className="stat-card">\n          <span>{t("DashboardPage.metrics.activeUsers.label")}</span>\n          <strong>{t("DashboardPage.metrics.activeUsers.value")}</strong>\n        </article>\n        <article className="stat-card">\n          <span>{t("DashboardPage.metrics.conversion.label")}</span>\n          <strong>{t("DashboardPage.metrics.conversion.value")}</strong>\n        </article>\n      </div>\n    </section>\n  )\n}\n`;
    }

    if (normalizedPath === "app/[locale]/settings/page.tsx") {
      return `"use client"\n\nimport { useTranslation } from "react-i18next"\n\nexport default function SettingsPage() {\n  const { t } = useTranslation()\n\n  return (\n    <section>\n      <span className="page-eyebrow">{t("SettingsPage.eyebrow")}</span>\n      <h1 className="page-title">{t("SettingsPage.title")}</h1>\n      <p className="page-copy">{t("SettingsPage.description")}</p>\n\n      <div className="card-grid">\n        <article className="card">\n          <h2>{t("SettingsPage.preferences.language.title")}</h2>\n          <p>{t("SettingsPage.preferences.language.description")}</p>\n        </article>\n        <article className="card">\n          <h2>{t("SettingsPage.preferences.workspace.title")}</h2>\n          <p>{t("SettingsPage.preferences.workspace.description")}</p>\n        </article>\n      </div>\n    </section>\n  )\n}\n`;
    }

    if (normalizedPath === "components/navigation/app-shell.tsx") {
      return `"use client"\n\nimport type { ReactNode } from "react"\nimport { useEffect } from "react"\nimport { useAtom, useSetAtom } from "jotai"\nimport { useTranslation } from "react-i18next"\nimport { NavLink } from "@/components/navigation/nav-link"\nimport { LocaleSwitcher } from "@/components/shared/locale-switcher"\nimport {\n  activeWorkspaceAtom,\n  localePreferenceAtom,\n  sidebarOpenAtom\n} from "@/store/app-store"\n\nexport function AppShell({\n  children,\n  locale\n}: Readonly<{\n  children: ReactNode\n  locale: string\n}>) {\n  const { t } = useTranslation()\n  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)\n  const setActiveWorkspace = useSetAtom(activeWorkspaceAtom)\n  const setLocalePreference = useSetAtom(localePreferenceAtom)\n\n  useEffect(() => {\n    setLocalePreference(locale === "km" ? "km" : "en")\n  }, [locale, setLocalePreference])\n\n  return (\n    <div className="shell">\n      <aside className={sidebarOpen ? "sidebar is-open" : "sidebar"}>\n        <div>\n          <p className="sidebar-kicker">{t("Shell.brandKicker")}</p>\n          <h1 className="sidebar-title">{t("Shell.brandTitle")}</h1>\n          <p className="sidebar-copy">{t("Shell.brandDescription")}</p>\n        </div>\n\n        <nav className="sidebar-nav" aria-label={t("Shell.navigationLabel")}>\n          <NavLink href={\`/\${locale}\`} onNavigate={() => setActiveWorkspace("overview")}>\n            {t("Shell.links.overview")}\n          </NavLink>\n          <NavLink href={\`/\${locale}/dashboard\`} onNavigate={() => setActiveWorkspace("dashboard")}>\n            {t("Shell.links.dashboard")}\n          </NavLink>\n          <NavLink href={\`/\${locale}/settings\`} onNavigate={() => setActiveWorkspace("settings")}>\n            {t("Shell.links.settings")}\n          </NavLink>\n        </nav>\n      </aside>\n\n      <div className="shell-main">\n        <header className="shell-header">\n          <button\n            type="button"\n            className="toggle-button"\n            onClick={() => setSidebarOpen((current) => !current)}\n          >\n            {sidebarOpen ? t("Shell.collapse") : t("Shell.expand")}\n          </button>\n          <LocaleSwitcher />\n        </header>\n        <main className="shell-content">{children}</main>\n      </div>\n    </div>\n  )\n}\n`;
    }

    if (normalizedPath === "components/navigation/nav-link.tsx") {
      return `"use client"\n\nimport Link from "next/link"\nimport type { ReactNode } from "react"\nimport { usePathname } from "next/navigation"\nimport { cn } from "@/lib/utils"\n\nexport function NavLink({\n  href,\n  children,\n  onNavigate\n}: Readonly<{\n  href: string\n  children: ReactNode\n  onNavigate?: () => void\n}>) {\n  const pathname = usePathname()\n  const active = pathname === href || pathname.startsWith(\`\${href}/\`)\n\n  return (\n    <Link\n      href={href}\n      onClick={onNavigate}\n      className={cn("nav-link", active && "nav-link-active")}\n    >\n      {children}\n    </Link>\n  )\n}\n`;
    }

    if (normalizedPath === "components/shared/i18n-provider.tsx") {
      return `"use client"\n\nimport type { ReactNode } from "react"\nimport { useEffect } from "react"\nimport { I18nextProvider } from "react-i18next"\nimport i18n from "@/i18n/config"\n\nexport function I18nProvider({\n  children,\n  locale\n}: Readonly<{\n  children: ReactNode\n  locale: string\n}>) {\n  useEffect(() => {\n    void i18n.changeLanguage(locale)\n  }, [locale])\n\n  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>\n}\n`;
    }

    if (normalizedPath === "components/shared/locale-switcher.tsx") {
      return `"use client"\n\nimport { useSetAtom } from "jotai"\nimport { usePathname, useRouter } from "next/navigation"\nimport { useTranslation } from "react-i18next"\nimport { replaceLocaleInPath } from "@/lib/navigation"\nimport { localePreferenceAtom } from "@/store/app-store"\nimport type { AppLocale } from "@/types/navigation"\n\nexport function LocaleSwitcher() {\n  const { t, i18n } = useTranslation()\n  const pathname = usePathname()\n  const router = useRouter()\n  const setLocalePreference = useSetAtom(localePreferenceAtom)\n\n  return (\n    <label className="locale-switcher">\n      <span>{t("LocaleSwitcher.label")}</span>\n      <select\n        value={i18n.language}\n        onChange={(event) => {\n          const nextLocale = event.target.value as AppLocale\n          setLocalePreference(nextLocale)\n          router.replace(replaceLocaleInPath(pathname, nextLocale))\n        }}\n      >\n        <option value="en">{t("LocaleSwitcher.english")}</option>\n        <option value="km">{t("LocaleSwitcher.khmer")}</option>\n      </select>\n    </label>\n  )\n}\n`;
    }

    if (normalizedPath === "i18n/config.ts") {
      return `import i18n from "i18next"\nimport { initReactI18next } from "react-i18next"\nimport en from "@/messages/en.json"\nimport km from "@/messages/km.json"\n\nif (!i18n.isInitialized) {\n  void i18n.use(initReactI18next).init({\n    lng: "en",\n    fallbackLng: "en",\n    interpolation: {\n      escapeValue: false\n    },\n    resources: {\n      en: {\n        translation: en\n      },\n      km: {\n        translation: km\n      }\n    }\n  })\n}\n\nexport default i18n\n`;
    }

    if (normalizedPath === "lib/navigation.ts") {
      return `import type { AppLocale } from "@/types/navigation"\n\nexport function replaceLocaleInPath(pathname: string, nextLocale: AppLocale) {\n  const segments = pathname.split("/").filter(Boolean)\n\n  if (segments.length === 0) {\n    return \`/\${nextLocale}\`\n  }\n\n  const [, ...rest] = segments\n  return \`/\${nextLocale}\${rest.length > 0 ? \`/\${rest.join("/")}\` : ""}\`\n}\n`;
    }

    if (normalizedPath === "lib/utils.ts") {
      return `export function cn(...values: Array<string | false | null | undefined>) {\n  return values.filter(Boolean).join(" ")\n}\n`;
    }

    if (normalizedPath === "store/app-store.ts") {
      return `import { atom } from "jotai"\nimport type { AdminWorkspace, AppLocale } from "@/types/navigation"\n\nexport const sidebarOpenAtom = atom(true)\nexport const localePreferenceAtom = atom<AppLocale>("en")\nexport const activeWorkspaceAtom = atom<AdminWorkspace>("overview")\n`;
    }

    if (normalizedPath === "types/navigation.ts") {
      return `export const appLocales = ["en", "km"] as const\n\nexport type AppLocale = (typeof appLocales)[number]\nexport type AdminWorkspace = "overview" | "dashboard" | "settings"\n`;
    }

    if (normalizedPath === "messages/en.json") {
      return `{\n  "Shell": {\n    "brandKicker": "Infinity Admin",\n    "brandTitle": "Operations Console",\n    "brandDescription": "Base scaffold for routing, translations, and global UI state in a Next.js admin app.",\n    "navigationLabel": "Primary navigation",\n    "collapse": "Collapse sidebar",\n    "expand": "Expand sidebar",\n    "links": {\n      "overview": "Overview",\n      "dashboard": "Dashboard",\n      "settings": "Settings"\n    }\n  },\n  "LocaleSwitcher": {\n    "label": "Language",\n    "english": "English",\n    "khmer": "Khmer"\n  },\n  "HomePage": {\n    "eyebrow": "Starter",\n    "title": "Infinity Admin base scaffold",\n    "description": "This template starts with locale routing, translation loading, and shared Jotai atoms already connected.",\n    "cards": {\n      "routing": {\n        "title": "Locale-aware routing",\n        "description": "Every screen is mounted under a locale segment so navigation is ready for expansion."\n      },\n      "translation": {\n        "title": "react-i18next setup",\n        "description": "English and Khmer messages are loaded through a shared react-i18next configuration."\n      },\n      "state": {\n        "title": "Global UI state",\n        "description": "Sidebar and workspace state are centralized in lightweight Jotai atoms."\n      }\n    }\n  },\n  "DashboardPage": {\n    "eyebrow": "Analytics",\n    "title": "Dashboard workspace",\n    "description": "Use this route as the first feature slice for metrics, charts, and operational summaries.",\n    "metrics": {\n      "revenue": {\n        "label": "Revenue pipeline",\n        "value": "$128,400"\n      },\n      "activeUsers": {\n        "label": "Active users",\n        "value": "8,241"\n      },\n      "conversion": {\n        "label": "Conversion",\n        "value": "14.2%"\n      }\n    }\n  },\n  "SettingsPage": {\n    "eyebrow": "Configuration",\n    "title": "Workspace settings",\n    "description": "Language switching and shared workspace preferences already have their wiring in place.",\n    "preferences": {\n      "language": {\n        "title": "Translation flow",\n        "description": "The locale switcher updates both the route locale and the global preference atom."\n      },\n      "workspace": {\n        "title": "Shared state",\n        "description": "Expand the atom layer with auth, filters, or UI preferences as the admin surface grows."\n      }\n    }\n  }\n}\n`;
    }

    if (normalizedPath === "messages/km.json") {
      return `{\n  "Shell": {\n    "brandKicker": "Infinity Admin",\n    "brandTitle": "ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិការ",\n    "brandDescription": "គ្រោងមូលដ្ឋានសម្រាប់ routing, translation និង global UI state នៅក្នុង Next.js admin app។",\n    "navigationLabel": "មឺនុយសំខាន់",\n    "collapse": "បង្រួម sidebar",\n    "expand": "ពង្រីក sidebar",\n    "links": {\n      "overview": "ទិដ្ឋភាពទូទៅ",\n      "dashboard": "ផ្ទាំងគ្រប់គ្រង",\n      "settings": "ការកំណត់"\n    }\n  },\n  "LocaleSwitcher": {\n    "label": "ភាសា",\n    "english": "អង់គ្លេស",\n    "khmer": "ខ្មែរ"\n  },\n  "HomePage": {\n    "eyebrow": "មូលដ្ឋាន",\n    "title": "គ្រោង Infinity Admin",\n    "description": "Template នេះមាន locale routing, translation loading និង Jotai atoms តភ្ជាប់រួចជាស្រេច។",\n    "cards": {\n      "routing": {\n        "title": "Locale-aware routing",\n        "description": "គ្រប់ screen ទាំងអស់ស្ថិតនៅក្រោម locale segment ដើម្បីងាយស្រួលពង្រីក។"\n      },\n      "translation": {\n        "title": "react-i18next setup",\n        "description": "សារ English និង Khmer ត្រូវបាន load តាម react-i18next configuration មួយ។"\n      },\n      "state": {\n        "title": "Global UI state",\n        "description": "Sidebar និង workspace state ត្រូវបានគ្រប់គ្រងដោយ Jotai atoms ស្រាលៗ។"\n      }\n    }\n  },\n  "DashboardPage": {\n    "eyebrow": "វិភាគ",\n    "title": "ផ្ទាំង Dashboard",\n    "description": "ប្រើ route នេះសម្រាប់ metrics, charts និង operational summary របស់អ្នក។",\n    "metrics": {\n      "revenue": {\n        "label": "បំពង់ចំណូល",\n        "value": "$128,400"\n      },\n      "activeUsers": {\n        "label": "អ្នកប្រើសកម្ម",\n        "value": "8,241"\n      },\n      "conversion": {\n        "label": "អត្រាបម្លែង",\n        "value": "14.2%"\n      }\n    }\n  },\n  "SettingsPage": {\n    "eyebrow": "ការកំណត់",\n    "title": "ការកំណត់ workspace",\n    "description": "Language switching និង shared workspace preferences ត្រូវបានរៀបចំរួចជាស្រេច។",\n    "preferences": {\n      "language": {\n        "title": "Translation flow",\n        "description": "Locale switcher ប្តូរ route locale និងរក្សាទុក global preference atom ពេលតែមួយ។"\n      },\n      "workspace": {\n        "title": "Shared state",\n        "description": "អ្នកអាចបន្ថែម auth, filters ឬ UI preferences ទៅក្នុង atom layer នេះបាន។"\n      }\n    }\n  }\n}\n`;
    }

    if (normalizedName === "favicon.ico" || normalizedName === "vercel.svg") {
      return "Preview unavailable for this generated asset file.\n";
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
