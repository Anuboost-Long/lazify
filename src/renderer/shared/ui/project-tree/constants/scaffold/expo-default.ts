export const EXPO_PACKAGE_JSON = `{
  "name": "project-name",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "expo start --clear",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest --watchAll",
    "lint": "expo lint",
    "fix": "npx expo install --fix",
    "make-language": "node ./scripts/make-language.ts",
    "prebuild": "npx expo prebuild --clean ",
    "build:apk": "cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..",
    "preview:all": "eas build --profile preview",
    "preview:android": "eas build --platform android --profile preview",
    "preview:ios": "eas build --platform ios --profile preview",
    "prod:android": "eas build --platform android --profile production",
    "prod:ios": "eas build --platform ios --profile production",
    "dev:ios": "eas build --platform ios --profile development",
    "dev:android": "eas build --platform android --profile development",
    "update:preview": "eas update --branch preview --message",
    "update:production": "eas update --branch production --message",
    "submit:ios": "eas submit --platform ios",
    "submit:android": "eas submit --platform android",
    "build:version:set": "eas build:version:set --platform ios"
  },
  "dependencies": {
    "expo": "^54.0.33",
    "expo-build-properties": "~1.0.10",
    "expo-font": "~14.0.11",
    "expo-router": "~6.0.23",
    "expo-status-bar": "~3.0.9",
    "expo-web-browser": "~15.0.10",
    "jotai": "^2.10.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-svg": "15.12.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~19.1.10",
    "react-native-svg-transformer": "^1.1.0",
    "typescript": "~5.9.2"
  }
}
`

export const EXPO_APP_CONFIG = `export default ({ config }) => ({
  ...config,
  name: "Project Name",
  slug: "project-name",
  scheme: "project-name",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    ...config.ios,
    supportsTablet: true
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#10B981"
    }
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  plugins: [
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static"
        }
      }
    ],
    "expo-router",
    "expo-font",
    "expo-web-browser"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {
      origin: false
    }
  }
})
`

export const EXPO_TSCONFIG = `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
`

export const EXPO_BABEL_CONFIG = `module.exports = function (api) {
  api.cache(true)

  return {
    presets: ["babel-preset-expo"]
  }
}
`

export const EXPO_METRO_CONFIG = `const { getDefaultConfig } = require("expo/metro-config")

module.exports = (() => {
  const config = getDefaultConfig(__dirname)

  const { transformer, resolver } = config

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve(
      "react-native-svg-transformer",
      "react-native-dotenv"
    )
  }

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"]
  }

  return config
})()
`

export const EXPO_ENV_DTS = `/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore
`

export const EXPO_EAS_JSON = `{
  "cli": {
    "version": ">= 14.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "store"
    },
    "production": {}
  },
  "submit": {
    "production": {},
    "preview": {}
  }
}
`

export const EXPO_GITIGNORE = `node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/

# macOS
.DS_Store

# @generated expo-cli
.env
expo-env.d.ts
`

export const EXPO_ESLINTRC = `module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["simple-import-sort", "prettier"],
  root: true,
  rules: {
    "simple-import-sort/imports": "error",
    "prettier/prettier": "error",
    "sort-imports": "error"
  }
}
`

export const EXPO_APP_LAYOUT = `import { Provider } from "jotai"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "react-native"
import { DarkTheme, LightTheme } from "@/core/theme/colors"
import ThemeProvider from "@/core/theme/theme-provider"
import RootNavigation from "@/navigation/root-navigation"
import VersioningController from "@/components/versioning/versioning-controller"
import store from "@/api/store"

export default function Layout() {
  const colorScheme = useColorScheme()

  return (
    <ThemeProvider value={colorScheme === "light" ? LightTheme : DarkTheme}>
      <Provider store={store}>
        <VersioningController />
        <StatusBar style={"auto"} />
        <RootNavigation />
      </Provider>
    </ThemeProvider>
  )
}
`

export const EXPO_APP_INDEX = `import React, { useEffect, useRef, useState } from "react"
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native"
import { Logo } from "@/assets/icons/logo"
import { DarkTheme, LightTheme } from "@/core/theme/colors"
import { Theme } from "@/core/theme/theme-types"
import useTheme, { useThemeStyle } from "@/hooks/use-theme"

export default function Index() {
  const theme = useTheme()
  const [isPreviewDark, setIsPreviewDark] = useState(theme.isDark)
  const previewTheme = isPreviewDark ? DarkTheme : LightTheme
  const colors = previewTheme.colors
  const styles = useThemeStyle(createStyles, previewTheme)
  const toggleProgress = useRef(new Animated.Value(theme.isDark ? 1 : 0)).current

  useEffect(() => {
    setIsPreviewDark(theme.isDark)
  }, [theme.isDark])

  useEffect(() => {
    Animated.timing(toggleProgress, {
      toValue: isPreviewDark ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start()
  }, [isPreviewDark, toggleProgress])

  const toggleThumbStyle = {
    transform: [
      {
        translateX: toggleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [2, 28]
        })
      }
    ]
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backPlate} />
      <View style={styles.edgeRail} />

      <View style={styles.header}>
        <View style={styles.logoShell}>
          <Logo size={42} color={colors.Primary} boltColor={colors.ActivePrime} />
        </View>

        <View style={styles.modeControl}>
          <Text style={styles.modeText}>{isPreviewDark ? "Dark" : "Light"}</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isPreviewDark }}
            onPress={() => setIsPreviewDark((current) => !current)}
            style={styles.themeToggle}
          >
            <Animated.View style={[styles.toggleThumb, toggleThumbStyle]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>Created with Lazify</Text>
        <Text style={styles.title}>Your project is already dressed for launch.</Text>
        <Text style={styles.subtitle}>
          This onboarding screen is generated to prove the starter is not empty: it carries your brand, your theme,
          and the first impression your users deserve.
        </Text>
      </View>

      <View style={styles.showcase}>
        <View style={styles.showcaseHeader}>
          <View>
            <Text style={styles.panelLabel}>Lazify workspace</Text>
            <Text style={styles.panelTitle}>Production starter</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Ready</Text>
          </View>
        </View>

        <View style={styles.pipeline}>
          {["Theme", "Routes", "Store"].map((item, index) => (
            <View
              key={item}
              style={[
                styles.pipelineStep,
                index === 1 && styles.pipelineStepActive
              ]}
            >
              <Text style={[styles.pipelineIndex, index === 1 && styles.pipelineIndexActive]}>
                0{index + 1}
              </Text>
              <Text style={[styles.pipelineText, index === 1 && styles.pipelineTextActive]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeMuted}>app/index.tsx</Text>
          <Text style={styles.codeLine}>const styles = useThemeStyle(createStyles)</Text>
          <Text style={styles.codeLineAccent}>theme.primary = {colors.Primary}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          ["2", "Theme modes"],
          ["100%", "Brand ready"],
          ["0", "Blank screens"]
        ].map(([value, label]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.primaryAction}>
        <Text style={styles.primaryActionText}>Start building</Text>
      </Pressable>
    </ScrollView>
  )
}

const createStyles = (theme: Theme) => ({
  screen: {
    backgroundColor: theme.colors.BackGround,
    flex: 1
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 62,
    paddingBottom: 34
  },
  backPlate: {
    backgroundColor: theme.colors.PrimaryAscent,
    position: "absolute",
    top: -70,
    right: -80,
    width: 230,
    height: 230,
    borderRadius: 42,
    transform: [{ rotate: "18deg" }]
  },
  edgeRail: {
    backgroundColor: theme.colors.Primary,
    position: "absolute",
    top: 160,
    left: 0,
    width: 5,
    height: 190,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  logoShell: {
    alignItems: "center",
    backgroundColor: theme.colors.BackGroundLight,
    borderColor: theme.colors.Border,
    borderRadius: 22,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  modeControl: {
    alignItems: "center",
    backgroundColor: theme.colors.BackGroundLight,
    borderColor: theme.colors.Border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5
  },
  modeText: {
    color: theme.colors.Text,
    fontSize: 13,
    fontWeight: "800"
  },
  themeToggle: {
    backgroundColor: theme.colors.PrimaryAscent,
    borderColor: theme.colors.Border,
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 58
  },
  toggleThumb: {
    backgroundColor: theme.colors.Primary,
    borderRadius: 13,
    height: 24,
    width: 24
  },
  hero: {
    marginTop: 54
  },
  kicker: {
    color: theme.colors.Primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.Text,
    fontSize: 43,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 46,
    marginTop: 12
  },
  subtitle: {
    color: theme.colors.Inactive,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16
  },
  showcase: {
    backgroundColor: theme.colors.BackGroundLight,
    borderColor: theme.colors.Border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 32,
    padding: 18
  },
  showcaseHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  panelLabel: {
    color: theme.colors.Inactive,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  panelTitle: {
    color: theme.colors.Text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.PrimaryAscent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  liveDot: {
    backgroundColor: theme.colors.Primary,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  liveText: {
    color: theme.colors.Primary,
    fontSize: 12,
    fontWeight: "900"
  },
  pipeline: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22
  },
  pipelineStep: {
    backgroundColor: theme.colors.BackGround,
    borderColor: theme.colors.Border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 82,
    padding: 12
  },
  pipelineStepActive: {
    backgroundColor: theme.colors.Primary
  },
  pipelineIndex: {
    color: theme.colors.Primary,
    fontSize: 12,
    fontWeight: "900"
  },
  pipelineIndexActive: {
    color: theme.colors.White
  },
  pipelineText: {
    color: theme.colors.Text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 15
  },
  pipelineTextActive: {
    color: theme.colors.White
  },
  codeCard: {
    backgroundColor: theme.colors.BackGround,
    borderColor: theme.colors.Border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16
  },
  codeMuted: {
    color: theme.colors.Inactive,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10
  },
  codeLine: {
    color: theme.colors.Text,
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 21
  },
  codeLineAccent: {
    color: theme.colors.Primary,
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 21
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  statCard: {
    backgroundColor: theme.colors.BackGroundLight,
    borderColor: theme.colors.Border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14
  },
  statValue: {
    color: theme.colors.Text,
    fontSize: 24,
    fontWeight: "900"
  },
  statLabel: {
    color: theme.colors.Inactive,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: theme.colors.Primary,
    borderRadius: 8,
    marginTop: 22,
    paddingVertical: 17
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  }
} as const)
`

export const EXPO_API_STORE = `import { createStore } from "jotai"

const store = createStore()

export default store
`

export const EXPO_LOGO = `import Svg, { Line, Path, Polygon, Rect, SvgProps } from "react-native-svg"

interface LogoProps extends SvgProps {
  size?: number
  /** Color for the folder body and file-tree structure */
  color?: string
  /** Color for the lightning-bolt accent element */
  boltColor?: string
}

export function Logo({
  size = 24,
  color = "#047857",
  boltColor = "#F47521",
  ...props
}: LogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <Path
        d="M2.5 7.5 C2.5 6.67 3.17 6 4 6 L8 6 C8.3 6 8.55 6.15 8.72 6.38 L9.5 7.5 L20 7.5 C20.83 7.5 21.5 8.17 21.5 9 L21.5 19 C21.5 19.83 20.83 20.5 20 20.5 L4 20.5 C3.17 20.5 2.5 19.83 2.5 19 Z"
        fill={color}
        fillOpacity="0.12"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <Line x1="6" y1="10.5" x2="6" y2="17.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <Line x1="6" y1="10.5" x2="9" y2="10.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <Rect x="9" y="9.5" width="3.5" height="2" rx="0.4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.6" />
      <Line x1="6" y1="13" x2="8.5" y2="13" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <Rect x="8.5" y="12" width="3" height="2" rx="0.4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.6" />
      <Line x1="6" y1="15.5" x2="8.5" y2="15.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <Rect x="8.5" y="14.5" width="2.5" height="2" rx="0.4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.6" />
      <Line x1="6" y1="17.5" x2="12.5" y2="17.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <Rect x="12.5" y="16.5" width="3.5" height="2" rx="0.4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.6" />
      <Rect x="16.5" y="16.5" width="3" height="2" rx="0.4" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="0.6" />
      <Polygon
        points="15,3 12,8.5 14.2,8.5 11.5,14 17.5,7.5 15,7.5"
        fill={boltColor}
        stroke={boltColor}
        strokeWidth="0.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export default Logo
`

export const EXPO_USE_THEME = `import { useMemo } from "react"
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native"
import useTheme from "@/core/theme/theme-context"
import { Theme } from "@/core/theme/theme-types"

type ThemeStyleMap<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

/**
 * useThemeStyle — create StyleSheet styles that automatically re-compute when
 * the active theme changes. Pass an optional themeOverride to preview a
 * different theme without changing the global context (e.g. a light/dark toggle).
 *
 * Usage:
 *   const styles = useThemeStyle(createStyles)
 *
 *   const createStyles = (theme: Theme) => ({
 *     container: { backgroundColor: theme.colors.BackGround },
 *   })
 */
export function useThemeStyle<T extends ThemeStyleMap<T>>(
  createStyles: (theme: Theme) => T,
  themeOverride?: Theme
) {
  const theme = useTheme()
  const activeTheme = themeOverride ?? theme

  return useMemo(() => StyleSheet.create(createStyles(activeTheme)) as T, [activeTheme, createStyles])
}

export default useTheme
`

export const EXPO_ROOT_NAVIGATION = `import React from "react"
import { Stack } from "expo-router"
import useTheme from "@/core/theme/theme-context"

export default function RootNavigation() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.BackGround,
          flex: 1
        }
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  )
}
`

export const EXPO_VERSIONING_CONTROLLER = `import React from "react"

export default function VersioningController() {
  return null
}
`

export const EXPO_THEME_COLORS = `import { Theme } from "@/core/theme/theme-types"

export const LightTheme: Theme = {
  isDark: false,
  colors: {
    Primary: "#047857",
    PrimaryAscent: "rgba(4,120,87,0.2)",
    White: "#FFFFFF",
    Inactive: "#6B7280",
    InactiveAscent: "rgba(107,114,128,0.2)",
    Active: "#047857",
    ActivePrime: "#047857",
    BackGround: "#FFFFFF",
    BackGroundLight: "#FEFEFE",
    Alert: "#dc2626",
    Text: "#000000",
    BgBlur: "rgba(255,255,255,0.5)",
    BackDrop: "rgba(0,0,0,0.4)",
    Outline: "rgba(0,0,0,0.05)",
    Border: "rgba(17,24,39,0.08)",
    PBgBlur: "rgba(255,255,255,0.8)"
  }
}

export const DarkTheme: Theme = {
  isDark: true,
  colors: {
    Primary: "#10B981",
    PrimaryAscent: "rgba(16,185,129,0.2)",
    White: "#FFFFFF",
    Inactive: "#ADADAD",
    InactiveAscent: "rgba(173,173,173,0.2)",
    Active: "#FFFFFF",
    ActivePrime: "#F47521",
    BackGround: "#111827",
    BackGroundLight: "#1f2937",
    Alert: "#dc2626",
    Text: "#f3f4f6",
    BgBlur: "rgba(0,0,0,0.5)",
    BackDrop: "rgba(0,0,0,0.4)",
    Outline: "rgba(255,255,255,0.05)",
    Border: "rgba(255,255,255,0.08)",
    PBgBlur: "rgba(17, 24, 39, 0.1)"
  }
}
`

export const EXPO_THEME_PROVIDER = `import React, { createContext } from "react"
import { LightTheme } from "@/core/theme/colors"
import { Theme } from "@/core/theme/theme-types"

export const ThemeContext = createContext<Theme>(LightTheme)

export default function ThemeProvider({
  value,
  children
}: Readonly<{
  value: Theme
  children: React.ReactNode
}>) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
`

export const EXPO_THEME_CONTEXT = `import { useContext } from "react"
import { ThemeContext } from "@/core/theme/theme-provider"

export default function useTheme() {
  return useContext(ThemeContext)
}
`

export const EXPO_THEME_TYPES = `export type Theme = {
  isDark: boolean
  colors: ThemeColors
}

export type ThemeColors = {
  Primary: string
  PrimaryAscent: string
  White: string
  Inactive: string
  InactiveAscent: string
  Active: string
  ActivePrime: string
  BackGround: string
  BackGroundLight: string
  Alert: string
  Text: string
  BgBlur: string
  BackDrop: string
  Outline: string
  Border: string
  PBgBlur: string
}
`

export const EXPO_ASSETS_TYPES = `declare module "*.svg" {
  import type React from "react"
  import type { SvgProps } from "react-native-svg"

  const content: React.FC<SvgProps>
  export default content
}
`
