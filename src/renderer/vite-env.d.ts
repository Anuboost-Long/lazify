/// <reference types="vite/client" />

import type { CommandChoicePrompt, LogEvent, CommandResult } from "../main/command-runner";
import type { TemplateDefinition } from "../main/scaffolding/harmonizer";
import type { NpmPackageSearchResult } from "../main/scaffolding/npm-registry";
import type { EnvironmentScan } from "../main/environment/scanner";
import type { ToolScanReport, NvmVersionList, NvmInstallResult, NvmActionResult, ToolUpdateInfo } from "../main/environment/environment-scanner";
import type { TemplatePackageEntry } from "../main/scaffolding/template-package-manifest";
import type {
  AgentFileChange,
  AgentUsageReport,
  EnvFileSummary,
  EnvVariablePatch,
  ProjectEnvFile,
  NpmAuditResult,
  NpmOutdatedResult,
  ProjectGitStatusResult,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ImportedProjectIndexResult,
  ImportedProjectScanResult,
  ProjectAssetFile,
  ProjectTreeNode,
  UpdateState
} from "./shared/types/lazify";
import type {
  CreateProjectPayload,
  InstallPackagePayload,
  WorkflowProgressEvent,
  WorkflowResult
} from "../main/scaffolding/workflow-engine";
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
      chooseCommandOption: (promptId: string, optionId: string) => Promise<boolean>;
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
      selectDirectories: () => Promise<string[]>;
      /** Finder picker for files and folders; empty when the user cancels. */
      selectPaths: (defaultPath?: string | null) => Promise<string[]>;
      importProjectFromDirectory: (projectPath: string) => Promise<ImportedProjectScanResult>;
      importProjectIndexFromDirectory: (projectPath: string) => Promise<ImportedProjectIndexResult>;
      readImportedProjectFile: (filePath: string) => Promise<string>;
      readProjectAssetFile: (filePath: string) => Promise<ProjectAssetFile>;
      getDiagnosticsPaths: () => Promise<import("../main/diagnostics/logger").DiagnosticsPaths>;
      getUpdateState: () => Promise<UpdateState>;
      checkForUpdates: () => Promise<UpdateState>;
      downloadUpdate: () => Promise<UpdateState>;
      quitAndInstallUpdate: () => Promise<void>;
      onUpdateStateChanged: (callback: (state: UpdateState) => void) => () => void;
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
      /** The project's .env files, and the variables inside the one asked for. */
      listEnvFiles: (projectPath: string) => Promise<EnvFileSummary[]>;
      readEnvFile: (projectPath: string, fileName: string) => Promise<ProjectEnvFile>;
      /**
       * Each mutation names the line *and* the key it expects to find there, so
       * an edit racing a change on disk is refused rather than misapplied. All
       * of them answer with the whole re-parsed file.
       */
      updateEnvVariable: (
        projectPath: string,
        fileName: string,
        line: number,
        expectedKey: string,
        patch: EnvVariablePatch
      ) => Promise<ProjectEnvFile>;
      deleteEnvVariable: (
        projectPath: string,
        fileName: string,
        line: number,
        expectedKey: string
      ) => Promise<ProjectEnvFile>;
      addEnvVariable: (
        projectPath: string,
        fileName: string,
        key: string,
        value: string
      ) => Promise<ProjectEnvFile>;
      createEnvFile: (projectPath: string, fileName: string) => Promise<ProjectEnvFile>;
      listScripts: (projectPath: string) => Promise<Record<string, string>>;
      runScript: (projectPath: string, scriptName: string, cols?: number, rows?: number) => Promise<{ runId: string; ptyAvailable: boolean }>;
      stopScript: (runId: string) => Promise<void>;
      restartScript: (runId: string, projectPath: string, scriptName: string, cols?: number, rows?: number) => Promise<{ runId: string; ptyAvailable: boolean }>;
      ptyWrite: (runId: string, data: string) => void;
      ptyBacklog: (runId: string) => Promise<import("../main/pty-runner").PtyBacklog>;
      ptyResize: (runId: string, cols: number, rows: number) => void;
      saveClipboardImage: () => Promise<string | null>;
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
      addProjectPackage: (payload: import("../main/scaffolding/workflow-engine").AddProjectPackagePayload) => Promise<import("../main/scaffolding/workflow-engine").WorkflowResult>;
      removeProjectPackage: (payload: import("../main/scaffolding/workflow-engine").RemoveProjectPackagePayload) => Promise<import("../main/scaffolding/workflow-engine").WorkflowResult>;
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
      ) => Promise<import("../main/projects/project-git-status").GitCheckoutResult>;
      stageFiles: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
      unstageFiles: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
      discardChanges: (
        projectPath: string,
        paths: string[],
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
      commitChanges: (
        projectPath: string,
        message: string,
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
      pushBranch: (
        projectPath: string,
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
      pullBranch: (
        projectPath: string,
      ) => Promise<import("../main/projects/git-actions").GitActionResult>;
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
      listHighlightingAssets: () => Promise<import("../main/code-intelligence/highlighting-store").HighlightingAssets>;
      openHighlightingFolder: () => Promise<void>;
      /** Opens a folder, or reveals a file selected inside its folder, in the OS file manager. */
      revealInFileManager: (targetPath: string) => Promise<void>;
      /** Opens the OS terminal rooted at the given folder. */
      detectEditors: () => Promise<
        import("../main/environment/editor-catalog").DetectedEditor[]
      >;
      openInEditor: (
        request: import("../main/environment/open-in-editor").OpenInEditorRequest
      ) => Promise<import("../main/environment/open-in-editor").OpenInEditorResult>;
      openTerminal: (targetPath: string) => Promise<void>;
      openExternalUrl: (url: string) => Promise<void>;
      listListeningProcesses: () => Promise<import("../main/environment/port-reaper").ListeningProcess[]>;
      killListeningProcess: (pid: number) => Promise<import("../main/environment/port-reaper").KillResult>;
      getLazyShieldState: () => Promise<import("../main/browser/lazy-shield").LazyShieldState>;
      setLazyShield: (enabled: boolean) => Promise<import("../main/browser/lazy-shield").LazyShieldState>;
      onLazyShieldBlocked: (callback: (event: { blocked: number }) => void) => () => void;
      /**
       * A guest tried to open a popup; the browser page turns it into a tab.
       * `background` is set when the click asked for a tab it does not switch to.
       */
      onBrowserOpenTab: (
        callback: (event: { url: string; background: boolean }) => void
      ) => () => void;
      /**
       * How far a two-finger swipe over a guest has got, so the page can draw
       * it. `null` means the gesture is over — navigated or abandoned.
       */
      onBrowserSwipeProgress: (
        callback: (
          event: import("../main/browser/swipe-navigation").SwipeProgressEvent | null
        ) => void
      ) => () => void;
      /**
       * A popup or a frame-driven redirect was held back. The browser page
       * offers it rather than opening it, since the user never asked for it.
       */
      onBrowserPopupBlocked: (
        callback: (event: import("../main/browser/popup-policy").BlockedPopup) => void
      ) => () => void;
      /** Remembers that this page's site may open popups from now on. */
      allowPopupsFrom: (sourceUrl: string) => Promise<void>;
      listPromptPresets: () => Promise<
        import("../main/prompts/types").PromptPreset[]
      >;
      createPromptPreset: (
        input: import("../main/prompts/types").PromptPresetInput
      ) => Promise<import("../main/prompts/types").PromptPreset>;
      updatePromptPreset: (
        id: string,
        input: import("../main/prompts/types").PromptPresetInput
      ) => Promise<import("../main/prompts/types").PromptPreset | null>;
      deletePromptPreset: (id: string) => Promise<boolean>;
      /** A project's own context plus every global entry. */
      listContextEntries: (
        projectPath: string
      ) => Promise<import("../main/prompts/types").ContextEntry[]>;
      createContextEntry: (
        input: import("../main/prompts/types").ContextEntryInput
      ) => Promise<import("../main/prompts/types").ContextEntry>;
      updateContextEntry: (
        id: string,
        input: import("../main/prompts/types").ContextEntryInput
      ) => Promise<boolean>;
      setContextEntryActive: (id: string, active: boolean) => Promise<boolean>;
      /** Switches a whole pack on or off; returns how many entries moved. */
      setContextPackActive: (
        scope: import("../main/prompts/types").ContextScope,
        scopeKey: string,
        pack: string,
        active: boolean
      ) => Promise<number>;
      deleteContextEntry: (id: string) => Promise<boolean>;
      /** Assembles the agent-ready prompt. No network, no model. */
      buildPrompt: (
        input: import("../main/prompts/types").BuildPromptInput
      ) => Promise<import("../main/prompts/types").BuiltPrompt>;
      suggestPromptPreset: (text: string) => Promise<string | null>;
      /** Tasks belong to a project and outlive the app being closed. */
      listTasks: (projectPath: string) => Promise<import("../main/tasks/types").Task[]>;
      /** Every project's tasks, for the home dashboard. */
      listAllTasks: () => Promise<import("../main/tasks/types").Task[]>;
      createTask: (
        input: import("../main/tasks/types").TaskInput
      ) => Promise<import("../main/tasks/types").Task>;
      updateTask: (
        id: string,
        input: import("../main/tasks/types").TaskInput
      ) => Promise<boolean>;
      /** `source` records whether the app moved it or a person did. */
      setTaskStatus: (
        id: string,
        status: import("../main/tasks/types").TaskStatus,
        source?: import("../main/tasks/types").TaskStatusSource
      ) => Promise<boolean>;
      /** Every move a task has made, oldest first. */
      listTaskStatusEvents: (
        taskId: string
      ) => Promise<import("../main/tasks/types").TaskStatusEvent[]>;
      reorderTask: (id: string, sortOrder: number) => Promise<boolean>;
      deleteTask: (id: string) => Promise<boolean>;
      /** Builds a stored task straight into an agent prompt. */
      buildTaskPrompt: (
        taskId: string
      ) => Promise<import("../main/prompts/types").BuiltPrompt | null>;
      /** Keeps the exact prompt an agent was handed, for the task's history. */
      recordTaskRun: (
        input: import("../main/tasks/types").TaskAgentRunInput
      ) => Promise<import("../main/tasks/types").TaskAgentRun>;
      listTaskRuns: (
        taskId: string
      ) => Promise<import("../main/tasks/types").TaskAgentRun[]>;
      completeTaskRun: (id: string) => Promise<boolean>;
      /** Closes any run still open for an agent that has just finished. */
      completeAgentTaskRuns: (agentRunId: string) => Promise<number>;
      openPictureInPicture: (
        url: string,
        source: import("../main/media/picture-in-picture").PictureInPictureSource
      ) => Promise<import("../main/media/picture-in-picture").PictureInPictureState>;
      closePictureInPicture: () => Promise<
        import("../main/media/picture-in-picture").PictureInPictureState
      >;
      getPictureInPictureState: () => Promise<
        import("../main/media/picture-in-picture").PictureInPictureState
      >;
      /** The one floating window opened, moved surface, or went away. */
      onPictureInPictureChanged: (
        callback: (state: import("../main/media/picture-in-picture").PictureInPictureState) => void
      ) => () => void;
      /**
       * Sends the guest's video to the OS mini player, or brings it back. Takes
       * the guest's id because the video may be in a frame the renderer cannot
       * reach on its own.
       */
      toggleMediaPictureInPicture: (
        webContentsId: number
      ) => Promise<import("../main/media/media-pip").MediaPipResult>;
      /**
       * Where a symbol is declared in a project, or null when nothing matches.
       * An import path resolves too, against `fromPath` — the file it was read
       * in, which is what makes a relative specifier mean anything. `position`
       * is where the name was clicked, which is how a JSX prop is recognised as
       * one and resolved through its component instead of by spelling.
       */
      scanProjectRoutes: (
        projectPath: string
      ) => Promise<import("../main/api-studio/types").SavedRouteScan>;
      readProjectRoutes: (
        projectPath: string
      ) => Promise<import("../main/api-studio/types").SavedRouteScan | null>;
      readRouteDetails: (
        projectPath: string,
        folder: string
      ) => Promise<import("../main/api-studio/types").SavedRouteDetail[]>;
      readApiEnvironments: (
        projectPath: string
      ) => Promise<import("../main/api-studio/types").ApiEnvironmentSet>;
      saveApiEnvironments: (
        projectPath: string,
        set: import("../main/api-studio/types").ApiEnvironmentSet,
        secretNames: string[]
      ) => Promise<import("../main/api-studio/types").ApiEnvironmentSet>;
      chooseUploadFile: () => Promise<string | null>;
      exportPostmanCollection: (
        projectPath: string
      ) => Promise<import("../main/api-studio/export").CollectionExport | null>;
      readApiRequests: (
        projectPath: string
      ) => Promise<import("../main/api-studio/request-store").RequestStore>;
      saveApiRequest: (
        projectPath: string,
        routeId: string,
        request: import("../main/api-studio/request-store").SavedRequest
      ) => Promise<import("../main/api-studio/request-store").RequestStore>;
      forgetApiRequest: (
        projectPath: string,
        routeId: string
      ) => Promise<import("../main/api-studio/request-store").RequestStore>;
      readApiResponseBody: (projectPath: string, bodyFile: string) => Promise<string>;
      readApiCollections: (
        projectPath: string
      ) => Promise<import("../main/api-studio/custom-collections").CustomCollection[]>;
      exportCustomCollection: (
        projectPath: string,
        collectionId: string,
        collectionName: string
      ) => Promise<import("../main/api-studio/export").CollectionExport | null>;
      saveResponseFile: (filePath: string, suggestedName: string) => Promise<string | null>;
      openResponseFile: (filePath: string) => Promise<string | null>;
      readApiCollectionBody: (projectPath: string, bodyFile: string) => Promise<string>;
      saveApiCollections: (
        projectPath: string,
        collections: import("../main/api-studio/custom-collections").CustomCollection[]
      ) => Promise<import("../main/api-studio/custom-collections").CustomCollection[]>;
      setApiRequestStorage: (
        projectPath: string,
        location: import("../main/api-studio/request-store").RequestStorage
      ) => Promise<import("../main/api-studio/request-store").RequestStore>;
      sendApiRequest: (
        draft: import("../main/api-studio/runner").ApiRequestDraft
      ) => Promise<import("../main/api-studio/runner").ApiSendOutcome>;
      runApiRequest: (
        input: import("../main/api-studio/scripting/types").ScriptedRunInput
      ) => Promise<import("../main/api-studio/scripting/types").ApiRunOutcome>;
      readAllowedHosts: (projectPath: string) => Promise<string[]>;
      allowApiHost: (projectPath: string, url: string) => Promise<string[]>;
      forgetApiHost: (projectPath: string, host: string) => Promise<string[]>;
      readScriptSettings: (
        projectPath: string
      ) => Promise<import("../main/api-studio/script-settings").ScriptSettings>;
      saveScriptSettings: (
        projectPath: string,
        settings: import("../main/api-studio/script-settings").ScriptSettings
      ) => Promise<import("../main/api-studio/script-settings").ScriptSettings>;
      readCollectionDoc: (
        projectPath: string,
        collectionId: string
      ) => Promise<import("../main/api-studio/docs").DocState | null>;
      saveCollectionDoc: (
        projectPath: string,
        doc: import("../main/api-studio/docs").CollectionDoc
      ) => Promise<import("../main/api-studio/docs").DocState | null>;
      previewCollectionDoc: (projectPath: string, collectionId: string) => Promise<string | null>;
      openCollectionDoc: (projectPath: string, collectionId: string) => Promise<string | null>;
      exportCollectionDoc: (
        projectPath: string,
        collectionId: string,
        format: import("../main/api-studio/docs").DocFormat,
        name: string
      ) => Promise<import("../main/api-studio/docs").DocExport | null>;
      chooseDocLogo: () => Promise<string | null>;
      collectionDocBrief: (
        projectPath: string,
        collectionId: string
      ) => Promise<import("../main/api-studio/docs").DocBrief | null>;
      collectionDocQuestions: (
        projectPath: string,
        collectionId: string,
        keys: string[]
      ) => Promise<string | null>;
      writeCollectionDocBrief: (
        projectPath: string,
        collectionId: string
      ) => Promise<import("../main/api-studio/docs").DocBriefFiles | null>;
      importCollectionDocDraft: (
        projectPath: string,
        collectionId: string,
        choose: boolean,
        onlyEmpty?: boolean
      ) => Promise<import("../main/api-studio/docs").DocImportResult | null>;
      watchCollectionDocDraft: (projectPath: string, collectionId: string) => Promise<boolean>;
      unwatchCollectionDocDraft: (collectionId: string) => Promise<void>;
      onCollectionDocDraftChanged: (callback: (collectionId: string) => void) => () => void;
      findSymbolDefinition: (
        projectPath: string,
        symbol: string,
        fromPath?: string | null,
        position?: { line: number; column: number } | null
      ) => Promise<import("../main/code-intelligence/symbol-finder").SymbolDefinition | null>;
      getAgentUsage: (sinceIso?: string, agentIds?: string[]) => Promise<AgentUsageReport>;
      setAgentBudget: (agentId: string, weeklyTokens: number) => Promise<Record<string, number>>;
      openAgentTerminal: (
        agentId: string,
        projectPath: string,
        cols?: number,
        rows?: number,
        resumeSessionId?: string,
        hidden?: boolean
      ) => Promise<{ runId: string }>;
      readZoom: () => Promise<number>;
      setZoom: (factor: number) => Promise<number>;
      stepZoom: (direction: 1 | -1) => Promise<number>;
      resetZoom: () => Promise<number>;
      onZoomChanged: (callback: (factor: number) => void) => () => void;
      onLog: (callback: (event: LogEvent) => void) => () => void;
      onCommandChoicePrompt: (callback: (prompt: CommandChoicePrompt) => void) => () => void;
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
