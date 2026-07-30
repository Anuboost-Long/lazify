import type { DotnetDetectionResult } from "./dotnet-detector";
import type { PackageJsonContent } from "./package-json-reader";
import type { SwiftDetectionResult } from "./swift-detector";
import type { PackageManager, StackDetectionResult } from "./types";

export function runScriptCommand(packageManager: PackageManager, script: string): string {
  switch (packageManager) {
    case "npm":
      return `npm run ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "pnpm":
      return `pnpm ${script}`;
    case "bun":
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
}

export function installCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "dotnet":
      return "dotnet restore";
    case "npm":
      return "npm install";
    case "yarn":
      return "yarn install";
    case "pnpm":
      return "pnpm install";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
}

export function runnerCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "npm":
      return "npx";
    case "yarn":
      return "yarn";
    case "pnpm":
      return "pnpm";
    case "bun":
      return "bunx";
    default:
      return "npx";
  }
}

function getScriptCommand(packageManager: PackageManager, scripts: Record<string, string> | undefined, script: string) {
  return scripts?.[script] ? runScriptCommand(packageManager, script) : undefined;
}

/**
 * `dotnet` commands are built from the project file rather than a script list,
 * because .NET has no equivalent of package.json scripts — the verbs are fixed
 * and only the target changes.
 */
export function buildDotnetCommands(dotnet: DotnetDetectionResult): StackDetectionResult["commands"] {
  // A solution builds and tests everything; `run` always needs a single project.
  const buildTarget = dotnet.solutionFile ?? dotnet.entryProjectFile;
  const runTarget = dotnet.entryProjectFile;

  const withTarget = (verb: string, target: string | null, flag = "") => {
    if (!target) return `dotnet ${verb}`;

    return flag ? `dotnet ${verb} ${flag} "${target}"` : `dotnet ${verb} "${target}"`;
  };

  const commands: StackDetectionResult["commands"] = {
    install: withTarget("restore", buildTarget),
    build: withTarget("build", buildTarget),
    dev: runTarget ? `dotnet watch run --project "${runTarget}"` : "dotnet watch run",
    start: withTarget("run", runTarget, "--project"),
    test: withTarget("test", buildTarget),
  };

  return commands;
}

/**
 * Swift commands come from the project layout, not a script list — like .NET,
 * the verbs are fixed and only the target changes.
 *
 * Two shapes, and they do not overlap: a Swift Package is driven entirely by
 * `swift`, while an app is driven by `xcodebuild` against a scheme. Where
 * CocoaPods is in play the workspace must be used, never the project, or the
 * build cannot see the pods.
 */
export function buildSwiftCommands(swift: SwiftDetectionResult): StackDetectionResult["commands"] {
  const target = swift.xcodeWorkspace ?? swift.xcodeProject;

  if (target) {
    const flag = swift.xcodeWorkspace ? "-workspace" : "-project";
    const scheme = swift.scheme ? ` -scheme "${swift.scheme}"` : "";
    const against = `xcodebuild ${flag} "${target}"${scheme}`;

    return {
      // Pods first when there are any: the workspace does not build without them.
      install: swift.podfile
        ? "pod install"
        : `xcodebuild ${flag} "${target}" -resolvePackageDependencies`,
      build: `${against} build`,
      test: `${against} test`,
      // An app is run from Xcode — it needs a simulator or a device, which is a
      // choice this cannot make on the user's behalf.
      start: `open "${target}"`,
    };
  }

  return {
    install: "swift package resolve",
    build: "swift build",
    dev: "swift run",
    start: "swift run",
    test: "swift test",
  };
}

export function buildCommands(input: {
  stack: StackDetectionResult["stack"];
  packageManager: PackageManager;
  packageJson: PackageJsonContent | null;
}): StackDetectionResult["commands"] {
  const scripts = input.packageJson?.scripts;
  const commands: StackDetectionResult["commands"] = {
    install: installCommand(input.packageManager),
  };

  const assignScriptIfPresent = (name: keyof StackDetectionResult["commands"], script: string) => {
    const value = getScriptCommand(input.packageManager, scripts, script);

    if (value) {
      commands[name] = value;
      return true;
    }

    return false;
  };

  switch (input.stack) {
    case "react-native-expo":
      assignScriptIfPresent("dev", "dev");
      commands.start =
        getScriptCommand(input.packageManager, scripts, "start") ??
        `${runnerCommand(input.packageManager)} expo start`;
      commands.android =
        getScriptCommand(input.packageManager, scripts, "android") ??
        `${runnerCommand(input.packageManager)} expo start --android`;
      commands.ios =
        getScriptCommand(input.packageManager, scripts, "ios") ??
        `${runnerCommand(input.packageManager)} expo start --ios`;
      commands.web =
        getScriptCommand(input.packageManager, scripts, "web") ??
        `${runnerCommand(input.packageManager)} expo start --web`;
      assignScriptIfPresent("build", "build");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "react-native-cli":
      assignScriptIfPresent("dev", "dev");
      commands.start = getScriptCommand(input.packageManager, scripts, "start");
      commands.android =
        getScriptCommand(input.packageManager, scripts, "android") ??
        `${runnerCommand(input.packageManager)} react-native run-android`;
      commands.ios =
        getScriptCommand(input.packageManager, scripts, "ios") ??
        `${runnerCommand(input.packageManager)} react-native run-ios`;
      assignScriptIfPresent("build", "build");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "react-next":
      commands.dev = getScriptCommand(input.packageManager, scripts, "dev") ?? `${runnerCommand(input.packageManager)} next dev`;
      commands.build = getScriptCommand(input.packageManager, scripts, "build") ?? `${runnerCommand(input.packageManager)} next build`;
      commands.start = getScriptCommand(input.packageManager, scripts, "start") ?? `${runnerCommand(input.packageManager)} next start`;
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "react-vite":
      commands.dev = getScriptCommand(input.packageManager, scripts, "dev") ?? `${runnerCommand(input.packageManager)} vite`;
      commands.build =
        getScriptCommand(input.packageManager, scripts, "build") ?? `${runnerCommand(input.packageManager)} vite build`;
      commands.preview =
        getScriptCommand(input.packageManager, scripts, "preview") ?? `${runnerCommand(input.packageManager)} vite preview`;
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "react-cra":
      commands.dev = getScriptCommand(input.packageManager, scripts, "start");
      commands.start = getScriptCommand(input.packageManager, scripts, "start");
      commands.build = getScriptCommand(input.packageManager, scripts, "build");
      commands.test = getScriptCommand(input.packageManager, scripts, "test");
      break;
    case "electron":
      assignScriptIfPresent("dev", "electron:dev") ||
        assignScriptIfPresent("dev", "dev") ||
        assignScriptIfPresent("dev", "electron");
      assignScriptIfPresent("start", "start");
      assignScriptIfPresent("build", "build") || assignScriptIfPresent("build", "dist") || assignScriptIfPresent("build", "make") || assignScriptIfPresent("build", "package");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "node-api":
      assignScriptIfPresent("dev", "dev");
      assignScriptIfPresent("start", "start");
      assignScriptIfPresent("build", "build");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    case "react-unknown":
      assignScriptIfPresent("dev", "dev");
      assignScriptIfPresent("start", "start");
      assignScriptIfPresent("build", "build");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
    default:
      assignScriptIfPresent("dev", "dev");
      assignScriptIfPresent("start", "start");
      assignScriptIfPresent("build", "build");
      assignScriptIfPresent("test", "test");
      assignScriptIfPresent("lint", "lint");
      break;
  }

  return commands;
}
