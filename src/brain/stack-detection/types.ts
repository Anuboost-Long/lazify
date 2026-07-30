export type ProjectStack =
  | "react-vite"
  | "react-next"
  | "react-cra"
  | "react-unknown"
  | "react-native-expo"
  | "react-native-cli"
  | "node-api"
  | "electron"
  | "dotnet"
  /** Swift with SwiftUI views — the split matters, the tooling does not. */
  | "swift-ui"
  /** Swift without SwiftUI: UIKit, a package, or a command-line tool. */
  | "swift"
  | "unknown";

export type PackageManager =
  | "npm"
  | "yarn"
  | "pnpm"
  | "bun"
  | "dotnet"
  | "swiftpm"
  | "cocoapods"
  | "unknown";

export interface StackDetectionResult {
  stack: ProjectStack;
  framework: "react" | "react-native" | "node" | "electron" | "dotnet" | "swift" | "unknown";
  metaFramework:
    | "vite"
    | "nextjs"
    | "expo"
    | "react-native-cli"
    | "cra"
    | "express"
    | "electron"
    | "aspnet"
    | "blazor"
    | "maui"
    | "dotnet-console"
    | "swiftui"
    | "uikit"
    | "swiftpm"
    | "unknown";
  packageManager: PackageManager;
  commands: {
    install: string;
    dev?: string;
    start?: string;
    build?: string;
    preview?: string;
    test?: string;
    lint?: string;
    android?: string;
    ios?: string;
    web?: string;
  };
  confidence: number;
  reasons: string[];
  warnings: string[];
}
