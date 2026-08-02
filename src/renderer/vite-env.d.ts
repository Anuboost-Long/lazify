/// <reference types="vite/client" />

import type { LogEvent, CommandResult } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type { EnvironmentScan } from "../main/scanner";
import type { ToolScanReport, NvmVersionList, NvmInstallResult, NvmActionResult, ToolUpdateInfo } from "../main/environment-scanner";
import type { TemplatePackageEntry } from "../main/template-package-manifest";
import type {
  AgentFileChange,
  AgentUsageReport,
  NpmAuditResult,
  NpmOutdatedResult,
  ProjectGitStatusResult,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ImportedProjectIndexResult,
  ImportedProjectScanResult,
  ProjectTreeNode
} from "./shared/types/lazify";
import type {
  CreateProjectPayload,
  FinalizeProjectPayload,
  InstallPackagePayload,
  PrepareProjectResult,
  WorkflowProgressEvent,
  WorkflowResult
} from "../main/workflow-engine";
import type { VersionMatchReport } from "./shared/types/lazify";
import type { AgentDescriptor } from "../main/agents/agent-registry";

declare global {
  /** Injected by vite from package.json — see `define` in vite.config.ts. */
  const __APP_VERSION__: string;

  interface Window {
    lazify: {
      /** The host OS, for features that only exist on one of them. */
      platform: string;
      runCommand: (command: string, args: string[], cwd?: string) => Promise<CommandResult>;
      createProject: (payload: CreateProjectPayload) => Promise<WorkflowResult>;
      prepareProject: (payload: CreateProjectPayload) => Promise<PrepareProjectResult>;
      finalizeProject: (payload: FinalizeProjectPayload) => Promise<WorkflowResult>;
      discardPreparedProject: (projectPath: string) => Promise<{ removed: boolean }>;
      installPackage: (payload: InstallPackagePayload) => Promise<WorkflowResult>;
      checkEnvironment: () => Promise<EnvironmentScan>;
      scanTools: (force?: boolean) => Promise<ToolScanReport>;
      probeTool: (name: string) => Promise<import("../renderer/shared/types/lazify").DetectedTool | null>;
      nvmListVersions: () => Promise<NvmVersionList>;
      installNvm: () => Promise<NvmInstallResult>;
      nvmSetDefault: (version: string) => Promise<NvmActionResult>;
      nvmUse: (version: string) => Promise<NvmActionResult>;
      installTool: (toolName: string) => Promise<NvmActionResult>;
      uninstallTool: (toolName: string) => Promise<NvmActionResult>;
      checkToolUpdate: (toolName: string, currentVersion: string) => Promise<ToolUpdateInfo>;
      updateTool: (toolName: string) => Promise<NvmActionResult>;
      relaunchApp: () => Promise<void>;
      signalRendererReady: () => void;
      listTemplates: () => Promise<TemplateDefinition[]>;
      listImportedTemplates: () => Promise<ImportedTemplateOption[]>;
      getImportedTemplate: (templateId: string) => Promise<ImportedTemplateSnapshot>;
      updateImportedTemplate: (
        templateId: string,
        updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
      ) => Promise<ImportedTemplateSnapshot>;
      deleteImportedTemplate: (templateId: string) => Promise<void>;
      getTemplatePackageManifest: (templateId: string) => Promise<TemplatePackageEntry[]>;
      searchNpmPackages: (query: string) => Promise<NpmPackageSearchResult[]>;
      selectDirectory: () => Promise<string | null>;
      /** Finder picker for files and folders; empty when the user cancels. */
      selectPaths: (defaultPath?: string | null) => Promise<string[]>;
      importProjectFromDirectory: (projectPath: string) => Promise<ImportedProjectScanResult>;
      importProjectIndexFromDirectory: (projectPath: string) => Promise<ImportedProjectIndexResult>;
      readImportedProjectFile: (filePath: string) => Promise<string>;
      getProjectGitStatus: (projectPath: string) => Promise<ProjectGitStatusResult>;
      getWorkingChanges: (projectPath: string) => Promise<AgentFileChange[]>;
      getFileDiff: (
        projectPath: string,
        filePath: string,
        fullFile?: boolean
      ) => Promise<string>;
      getNpmOutdated: (projectPath: string) => Promise<NpmOutdatedResult>;
      getNpmAudit: (projectPath: string) => Promise<NpmAuditResult>;
      listSessions: () => Promise<import("./shared/types/lazify").PtySession[]>;
      listScripts: (projectPath: string) => Promise<Record<string, string>>;
      runScript: (projectPath: string, scriptName: string, cols?: number, rows?: number) => Promise<{ runId: string; ptyAvailable: boolean }>;
      stopScript: (runId: string) => Promise<void>;
      restartScript: (runId: string, projectPath: string, scriptName: string, cols?: number, rows?: number) => Promise<{ runId: string; ptyAvailable: boolean }>;
      ptyWrite: (runId: string, data: string) => void;
      ptyBacklog: (runId: string) => Promise<import("../main/pty-runner").PtyBacklog>;
      ptyResize: (runId: string, cols: number, rows: number) => void;
      onAgentAttention: (
        callback: (event: {
          runId: string;
          projectPath: string;
          projectName: string;
          agentLabel: string;
          waiting: boolean;
          /** Why autopilot left this prompt to the user, when it looked at it. */
          hold: import("../main/agents/autopilot-policy").AutopilotHold | null;
        }) => void
      ) => () => void;
      /** A prompt autopilot answered by itself — recorded, never announced. */
      onAutopilotAnswered: (
        callback: (event: {
          runId: string;
          projectPath: string;
          projectName: string;
          agentLabel: string;
          question: string;
          optionLabel: string;
        }) => void
      ) => () => void;
      autopilotSettings: () => Promise<
        import("../main/agents/autopilot-store").AutopilotSettings
      >;
      setAutopilot: (
        enabled: boolean
      ) => Promise<import("../main/agents/autopilot-store").AutopilotSettings>;
      setAutopilotProject: (
        projectPath: string,
        enabled: boolean
      ) => Promise<import("../main/agents/autopilot-store").AutopilotSettings>;
      onAgentDone: (
        callback: (event: {
          runId: string;
          projectPath: string;
          projectName: string;
          agentLabel: string;
        }) => void
      ) => () => void;
      onAgentFocus: (
        callback: (event: { runId: string; projectPath: string }) => void
      ) => () => void;
      onPtyData: (
        callback: (event: { runId: string; data: string; seq?: number }) => void
      ) => () => void;
      onScriptStatus: (callback: (event: import("./shared/types/lazify").ScriptStatusEvent) => void) => () => void;
      onSessionKilled: (callback: (event: { runId: string }) => void) => () => void;
      listProjectPackages: (projectPath: string) => Promise<import("./shared/types/lazify").InstalledPackage[]>;
      addProjectPackage: (payload: import("../main/workflow-engine").AddProjectPackagePayload) => Promise<import("../main/workflow-engine").WorkflowResult>;
      removeProjectPackage: (payload: import("../main/workflow-engine").RemoveProjectPackagePayload) => Promise<import("../main/workflow-engine").WorkflowResult>;
      installProjectDependencies: (projectPath: string) => Promise<WorkflowResult>;
      saveImportedTemplate: (
        projectPath: string,
        includedRelativePaths: string[],
        providedName?: string | null,
        confirmedStack?: string | null
      ) => Promise<ImportedTemplateSnapshot>;
      matchPackageVersions: (projectPath: string) => Promise<VersionMatchReport>;
      fixProjectPackageVersions: (projectPath: string) => Promise<WorkflowResult>;
      listAgents: () => Promise<AgentDescriptor[]>;
      listAgentSessions: (
        projectPath: string
      ) => Promise<import("../main/agents/agent-sessions").AgentSessionSummary[]>;
      addCustomAgent: (
        input: import("../main/agents/custom-agents-store").CustomAgentInput
      ) => Promise<import("../main/agents/custom-agents-store").CustomAgent>;
      removeCustomAgent: (agentId: string) => Promise<void>;
      checkoutBranch: (
        projectPath: string,
        branch: string,
      ) => Promise<import("../main/project-git-status").GitCheckoutResult>;
      stageFiles: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/git-actions").GitActionResult>;
      unstageFiles: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/git-actions").GitActionResult>;
      discardChanges: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/git-actions").GitActionResult>;
      commitChanges: (
        projectPath: string,
        message: string,
      ) => Promise<import("../main/git-actions").GitActionResult>;
      pushBranch: (
        projectPath: string,
      ) => Promise<import("../main/git-actions").GitActionResult>;
      /** Where a dropped file lives on disk; empty when it has no path. */
      pathForDroppedFile: (file: File) => string;
      /** DMG compiler: pick an app, pick where the image goes, build it. */
      selectAppBundle: () => Promise<string | null>;
      selectDmgDestination: (suggestedPath: string) => Promise<string | null>;
      inspectAppBundle: (
        appPath: string
      ) => Promise<import("../main/dmg-compiler").AppBundleInfo>;
      defaultDmgPath: (appPath: string, suggestedFileName: string) => Promise<string>;
      /** Backdrop or volume icon for the mounted window. Null when cancelled. */
      selectDmgImage: (kind: "background" | "icon") => Promise<string | null>;
      /** Any image as a PNG data URL, for showing one that lives outside the app. */
      dmgImagePreview: (imagePath: string, maxPixels?: number) => Promise<string | null>;
      compileDmg: (
        appPath: string,
        outputPath: string,
        volumeName?: string | null,
        backgroundImagePath?: string | null,
        volumeIconPath?: string | null
      ) => Promise<import("../main/dmg-compiler").DmgResult>;
      onDmgProgress: (
        callback: (progress: import("../main/dmg-compiler").DmgProgress) => void
      ) => () => void;
      listHighlightingAssets: () => Promise<import("../main/highlighting-store").HighlightingAssets>;
      openHighlightingFolder: () => Promise<void>;
      /** Opens a folder, or reveals a file selected inside its folder, in the OS file manager. */
      revealInFileManager: (targetPath: string) => Promise<void>;
      openExternalUrl: (url: string) => Promise<void>;
      listListeningProcesses: () => Promise<import("../main/port-reaper").ListeningProcess[]>;
      killListeningProcess: (pid: number) => Promise<import("../main/port-reaper").KillResult>;
      getLazyShieldState: () => Promise<import("../main/lazy-shield").LazyShieldState>;
      setLazyShield: (enabled: boolean) => Promise<import("../main/lazy-shield").LazyShieldState>;
      onLazyShieldBlocked: (callback: (event: { blocked: number }) => void) => () => void;
      /**
       * A guest tried to open a popup; the browser page turns it into a tab.
       * `background` is set when the click asked for a tab it does not switch to.
       */
      onBrowserOpenTab: (
        callback: (event: { url: string; background: boolean }) => void
      ) => () => void;
      /**
       * A popup or a frame-driven redirect was held back. The browser page
       * offers it rather than opening it, since the user never asked for it.
       */
      onBrowserPopupBlocked: (
        callback: (event: import("../main/popup-policy").BlockedPopup) => void
      ) => () => void;
      /** Remembers that this page's site may open popups from now on. */
      allowPopupsFrom: (sourceUrl: string) => Promise<void>;
      openPictureInPicture: (
        url: string,
        source: import("../main/picture-in-picture").PictureInPictureSource
      ) => Promise<import("../main/picture-in-picture").PictureInPictureState>;
      closePictureInPicture: () => Promise<
        import("../main/picture-in-picture").PictureInPictureState
      >;
      getPictureInPictureState: () => Promise<
        import("../main/picture-in-picture").PictureInPictureState
      >;
      /** The one floating window opened, moved surface, or went away. */
      onPictureInPictureChanged: (
        callback: (state: import("../main/picture-in-picture").PictureInPictureState) => void
      ) => () => void;
      /**
       * Sends the guest's video to the OS mini player, or brings it back. Takes
       * the guest's id because the video may be in a frame the renderer cannot
       * reach on its own.
       */
      toggleMediaPictureInPicture: (
        webContentsId: number
      ) => Promise<import("../main/media-pip").MediaPipResult>;
      /**
       * Where a symbol is declared in a project, or null when nothing matches.
       * An import path resolves too, against `fromPath` — the file it was read
       * in, which is what makes a relative specifier mean anything. `position`
       * is where the name was clicked, which is how a JSX prop is recognised as
       * one and resolved through its component instead of by spelling.
       */
      findSymbolDefinition: (
        projectPath: string,
        symbol: string,
        fromPath?: string | null,
        position?: { line: number; column: number } | null
      ) => Promise<import("../main/symbol-finder").SymbolDefinition | null>;
      getAgentUsage: (sinceIso?: string, agentIds?: string[]) => Promise<AgentUsageReport>;
      setAgentBudget: (agentId: string, weeklyTokens: number) => Promise<Record<string, number>>;
      openAgentTerminal: (
        agentId: string,
        projectPath: string,
        cols?: number,
        rows?: number,
        resumeSessionId?: string
      ) => Promise<{ runId: string }>;
      onLog: (callback: (event: LogEvent) => void) => () => void;
      /** Fires once an agent's transcript goes quiet — i.e. that agent's turn finished. */
      onAgentActivity: (
        callback: (event: import("../main/agents/agent-activity-watcher").AgentActivityEvent) => void
      ) => () => void;
      onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
    };
  }

  // Exposed on globalThis (renderer) so `globalThis.lazify` resolves without `window`.
  // eslint-disable-next-line no-var
  var lazify: Window["lazify"];

  /**
   * The `<webview>` the agent preview browser renders. Electron ships no JSX
   * typing for the tag, and the renderer must not pull in the electron types,
   * so only the surface the preview toolbar actually drives is declared here.
   */
  interface LazifyWebviewElement extends HTMLElement {
    src: string;
    getURL: () => string;
    getTitle: () => string;
    loadURL: (url: string) => Promise<void>;
    reload: () => void;
    stop: () => void;
    goBack: () => void;
    goForward: () => void;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    openDevTools: () => void;
    closeDevTools: () => void;
    isDevToolsOpened: () => boolean;
    /**
     * Runs code inside the guest. `userGesture` is what lets the page's own
     * picture-in-picture request through — Chromium refuses one that did not
     * come from a user action.
     */
    executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>;
    /** Identifies the guest to main, which can reach its frames. */
    getWebContentsId: () => number;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          /** Isolates each surface's cookies and storage from the others. */
          partition?: string;
          /** React's own webview typing already declares this as a boolean. */
          allowpopups?: boolean;
          /** Guest webPreferences, e.g. "backgroundThrottling=no". */
          webpreferences?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
