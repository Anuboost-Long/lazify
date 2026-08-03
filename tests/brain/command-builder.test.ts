import { describe, expect, it } from "vitest";

import {
  buildCommands,
  buildDotnetCommands,
  buildSwiftCommands,
  installCommand,
  runnerCommand,
  runScriptCommand
} from "../../src/brain/stack-detection/command-builder";
import type { PackageManager } from "../../src/brain/stack-detection/types";

describe("package-manager command helpers", () => {
  it("builds script commands using each package manager's syntax", () => {
    const expected: Partial<Record<PackageManager, string>> = {
      npm: "npm run dev",
      yarn: "yarn dev",
      pnpm: "pnpm dev",
      bun: "bun run dev",
      unknown: "npm run dev"
    };

    for (const [manager, command] of Object.entries(expected)) {
      expect(runScriptCommand(manager as PackageManager, "dev")).toBe(command);
    }
  });

  it("builds install commands for JavaScript and .NET projects", () => {
    expect(installCommand("npm")).toBe("npm install");
    expect(installCommand("yarn")).toBe("yarn install");
    expect(installCommand("pnpm")).toBe("pnpm install");
    expect(installCommand("bun")).toBe("bun install");
    expect(installCommand("dotnet")).toBe("dotnet restore");
    expect(installCommand("unknown")).toBe("npm install");
  });

  it("uses the matching package runner", () => {
    expect(runnerCommand("npm")).toBe("npx");
    expect(runnerCommand("yarn")).toBe("yarn");
    expect(runnerCommand("pnpm")).toBe("pnpm");
    expect(runnerCommand("bun")).toBe("bunx");
    expect(runnerCommand("unknown")).toBe("npx");
  });
});

describe("buildCommands", () => {
  it("prefers declared Next.js scripts and falls back for missing ones", () => {
    expect(
      buildCommands({
        stack: "react-next",
        packageManager: "yarn",
        packageJson: { scripts: { dev: "next dev --turbo", lint: "next lint" } }
      })
    ).toEqual({
      install: "yarn install",
      dev: "yarn dev",
      build: "yarn next build",
      start: "yarn next start",
      lint: "yarn lint"
    });
  });

  it("builds Vite fallbacks with the selected runner", () => {
    expect(
      buildCommands({ stack: "react-vite", packageManager: "bun", packageJson: null })
    ).toEqual({
      install: "bun install",
      dev: "bunx vite",
      build: "bunx vite build",
      preview: "bunx vite preview"
    });
  });

  it("builds Expo platform commands when package scripts are absent", () => {
    const commands = buildCommands({
      stack: "react-native-expo",
      packageManager: "npm",
      packageJson: { scripts: {} }
    });

    expect(commands.start).toBe("npx expo start");
    expect(commands.android).toBe("npx expo start --android");
    expect(commands.ios).toBe("npx expo start --ios");
    expect(commands.web).toBe("npx expo start --web");
  });

  it("uses the highest-priority Electron development and build scripts", () => {
    const commands = buildCommands({
      stack: "electron",
      packageManager: "npm",
      packageJson: {
        scripts: {
          "electron:dev": "electron-vite dev",
          dev: "vite",
          dist: "electron-builder",
          package: "electron-forge package"
        }
      }
    });

    expect(commands.dev).toBe("npm run electron:dev");
    expect(commands.build).toBe("npm run dist");
  });

  it("does not invent optional commands for a generic Node project", () => {
    expect(
      buildCommands({
        stack: "node-api",
        packageManager: "pnpm",
        packageJson: { scripts: { start: "node server.js" } }
      })
    ).toEqual({ install: "pnpm install", start: "pnpm start" });
  });
});

describe("buildDotnetCommands", () => {
  it("builds and tests the solution while running the entry project", () => {
    expect(
      buildDotnetCommands({
        projectFiles: ["src/App/App.csproj"],
        solutionFile: "App.sln",
        entryProjectFile: "src/App/App.csproj",
        language: "csharp",
        flavor: "aspnet",
        targetFramework: "net8.0",
        reasons: []
      })
    ).toEqual({
      install: 'dotnet restore "App.sln"',
      build: 'dotnet build "App.sln"',
      dev: 'dotnet watch run --project "src/App/App.csproj"',
      start: 'dotnet run --project "src/App/App.csproj"',
      test: 'dotnet test "App.sln"'
    });
  });

  it("uses command-only fallbacks when no project file was detected", () => {
    const commands = buildDotnetCommands({
      projectFiles: [],
      solutionFile: null,
      entryProjectFile: null,
      language: null,
      flavor: "dotnet-console",
      targetFramework: null,
      reasons: []
    });

    expect(commands.install).toBe("dotnet restore");
    expect(commands.dev).toBe("dotnet watch run");
    expect(commands.start).toBe("dotnet run");
  });
});

describe("buildSwiftCommands", () => {
  it("uses Swift Package Manager commands for a package", () => {
    expect(
      buildSwiftCommands({
        xcodeProject: null,
        xcodeWorkspace: null,
        packageFile: "Package.swift",
        podfile: null,
        scheme: null,
        ui: null,
        swiftFileCount: 0,
        reasons: []
      })
    ).toEqual({
      install: "swift package resolve",
      build: "swift build",
      dev: "swift run",
      start: "swift run",
      test: "swift test"
    });
  });

  it("prefers an Xcode workspace and CocoaPods when both are present", () => {
    const commands = buildSwiftCommands({
      xcodeProject: "App.xcodeproj",
      xcodeWorkspace: "App.xcworkspace",
      packageFile: null,
      podfile: "Podfile",
      scheme: "App",
      ui: "uikit",
      swiftFileCount: 12,
      reasons: []
    });

    expect(commands.install).toBe("pod install");
    expect(commands.build).toBe('xcodebuild -workspace "App.xcworkspace" -scheme "App" build');
    expect(commands.start).toBe('open "App.xcworkspace"');
  });
});
