# 02 — Contract manifest (first pass)

The privileged surface the renderer reaches through `window.lazify`
(`src/preload/api/index.ts` spreads every group into one object). Any
replacement must offer the same operations. The Chain app exposes them as
app-level TypeScript over `@chain/sdk` capabilities, so the names and
payloads below are the contract, not the IPC channels.

**What this pass covers:** each member, its kind, its IPC channel, and the
`src/main` file(s) that handle or emit it.

**Not covered yet:** per-method request and response schemas, typed failures,
required permissions, cancellation, generated-file ownership, and emitted
state events (roadmap, "Public capability groups"). Fill these group by group,
in the order of the work queue, before that group's ticket starts.

## Contract hazards found while generating this

- **File reads are not scoped to a project.** `readImportedProjectFile` and
  `readProjectAssetFile` resolve any absolute path the renderer passes
  (`src/main/projects/project-importer-optimized.ts`,
  `src/main/projects/project-asset-reader.ts`). The new bridge must enforce
  granted roots (roadmap rule 5). This tightens behaviour: document it as
  "Different by design", not as parity.
- **Main-process logic keeps running whether a screen is mounted or not.**
  Attention detection, autopilot answers, keep-awake and notifications watch
  PTY output in `src/main/main.ts` (`AttentionDetector`, `AwakeGuard`), with
  no renderer involved. Chain has no Node process, so this logic moves into
  the webview. It must catch up from the PTY backlog after a reload; see
  `../chain-sdk-requests/04-terminal-sessions.md`.
- `ptyWrite` and `ptyResize` are fire-and-forget `send`s. Their failures are
  currently silent.
- `platform` and `pathForDroppedFile` are computed in the preload with no
  IPC. Chain equivalents: `desktop.platform.getInfo()`; for dropped-file
  paths, nothing yet (see request 01).

## Regenerating

```bash
node docs/rewrite/scripts/generate-contract-manifest.mjs
```

Paste the output over everything below this section. It is the source of truth
for "every preload capability" in the roadmap's API/RPC compatibility gate.

## Members

Generated from `src/preload/api/*.ts`: 217 members (23 event, 189 request, 3 send (fire-and-forget), 2 value).

### `agents` — `src/preload/api/agents.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `onAgentAttention` | event | `lazify:agent-attention` | src/main/main.ts |
| `onAutopilotAnswered` | event | `lazify:autopilot-answered` | src/main/main.ts |
| `onAgentDone` | event | `lazify:agent-done` | src/main/main.ts |
| `onAgentFocus` | event | `lazify:agent-focus` | src/main/main.ts |
| `listAgents` | request | `lazify:list-agents` | src/main/ipc/agents.ts |
| `listAgentSessions` | request | `lazify:list-agent-sessions` | src/main/ipc/agents.ts |
| `addCustomAgent` | request | `lazify:add-custom-agent` | src/main/ipc/agents.ts |
| `removeCustomAgent` | request | `lazify:remove-custom-agent` | src/main/ipc/agents.ts |
| `autopilotSettings` | request | `lazify:autopilot-settings` | src/main/ipc/agents.ts |
| `setAutopilot` | request | `lazify:set-autopilot` | src/main/ipc/agents.ts |
| `setAutopilotProject` | request | `lazify:set-autopilot-project` | src/main/ipc/agents.ts |
| `keepAwake` | request | `lazify:keep-awake` | src/main/ipc/agents.ts |
| `setKeepAwake` | request | `lazify:set-keep-awake` | src/main/ipc/agents.ts |
| `getAgentUsage` | request | `lazify:agent-usage` | src/main/ipc/agents.ts |
| `setAgentBudget` | request | `lazify:set-agent-budget` | src/main/ipc/agents.ts |
| `openAgentTerminal` | request | `lazify:open-agent-terminal` | src/main/ipc/agents.ts |
| `onAgentActivity` | event | `lazify:agent-activity` | src/main/main.ts |

### `api-docs` — `src/preload/api/api-docs.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `readCollectionDoc` | request | `lazify:read-collection-doc` | src/main/ipc/api-docs.ts |
| `saveCollectionDoc` | request | `lazify:save-collection-doc` | src/main/ipc/api-docs.ts |
| `previewCollectionDoc` | request | `lazify:preview-collection-doc` | src/main/ipc/api-docs.ts |
| `openCollectionDoc` | request | `lazify:open-collection-doc` | src/main/ipc/api-docs.ts |
| `exportCollectionDoc` | request | `lazify:export-collection-doc` | src/main/ipc/api-docs.ts |
| `chooseDocLogo` | request | `lazify:choose-doc-logo` | src/main/ipc/api-docs.ts |
| `collectionDocBrief` | request | `lazify:collection-doc-brief` | src/main/ipc/api-docs.ts |
| `collectionDocQuestions` | request | `lazify:collection-doc-questions` | src/main/ipc/api-docs.ts |
| `writeCollectionDocBrief` | request | `lazify:write-collection-doc-brief` | src/main/ipc/api-docs.ts |
| `importCollectionDocDraft` | request | `lazify:import-collection-doc-draft` | src/main/ipc/api-docs.ts |
| `watchCollectionDocDraft` | request | `lazify:watch-collection-doc-draft` | src/main/ipc/api-docs.ts |
| `unwatchCollectionDocDraft` | request | `lazify:unwatch-collection-doc-draft` | src/main/ipc/api-docs.ts |
| `onCollectionDocDraftChanged` | event | `lazify:collection-doc-draft-changed` | src/main/ipc/api-docs.ts |

### `api-studio` — `src/preload/api/api-studio.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `scanProjectRoutes` | request | `lazify:scan-project-routes` | src/main/ipc/api-studio.ts |
| `readProjectRoutes` | request | `lazify:read-project-routes` | src/main/ipc/api-studio.ts |
| `readRouteDetails` | request | `lazify:read-route-details` | src/main/ipc/api-studio.ts |
| `readApiEnvironments` | request | `lazify:read-api-environments` | src/main/ipc/api-studio.ts |
| `saveApiEnvironments` | request | `lazify:save-api-environments` | src/main/ipc/api-studio.ts |
| `exportPostmanCollection` | request | `lazify:export-postman-collection` | src/main/ipc/api-studio.ts |
| `readApiRequests` | request | `lazify:read-api-requests` | src/main/ipc/api-studio.ts |
| `saveApiRequest` | request | `lazify:save-api-request` | src/main/ipc/api-studio.ts |
| `forgetApiRequest` | request | `lazify:forget-api-request` | src/main/ipc/api-studio.ts |
| `readApiResponseBody` | request | `lazify:read-api-response-body` | src/main/ipc/api-studio.ts |
| `readApiCollections` | request | `lazify:read-api-collections` | src/main/ipc/api-studio.ts |
| `exportCustomCollection` | request | `lazify:export-custom-collection` | src/main/ipc/api-studio.ts |
| `saveResponseFile` | request | `lazify:save-response-file` | src/main/ipc/api-studio.ts |
| `openResponseFile` | request | `lazify:open-response-file` | src/main/ipc/api-studio.ts |
| `readApiCollectionBody` | request | `lazify:read-api-collection-body` | src/main/ipc/api-studio.ts |
| `saveApiCollections` | request | `lazify:save-api-collections` | src/main/ipc/api-studio.ts |
| `setApiRequestStorage` | request | `lazify:set-api-request-storage` | src/main/ipc/api-studio.ts |
| `sendApiRequest` | request | `lazify:send-api-request` | src/main/ipc/api-studio.ts |
| `runApiRequest` | request | `lazify:run-api-request` | src/main/ipc/api-studio.ts |
| `readAllowedHosts` | request | `lazify:read-allowed-hosts` | src/main/ipc/api-studio.ts |
| `allowApiHost` | request | `lazify:allow-api-host` | src/main/ipc/api-studio.ts |
| `forgetApiHost` | request | `lazify:forget-api-host` | src/main/ipc/api-studio.ts |
| `readScriptSettings` | request | `lazify:read-script-settings` | src/main/ipc/api-studio.ts |
| `saveScriptSettings` | request | `lazify:save-script-settings` | src/main/ipc/api-studio.ts |

### `browser` — `src/preload/api/browser.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `getLazyShieldState` | request | `lazify:lazy-shield-state` | src/main/ipc/browser.ts |
| `setLazyShield` | request | `lazify:set-lazy-shield` | src/main/ipc/browser.ts |
| `onLazyShieldBlocked` | event | `lazify:lazy-shield-blocked` | src/main/main.ts |
| `onBrowserSwipeProgress` | event | `lazify:browser-swipe-progress` | src/main/browser/swipe-navigation.ts, src/main/main.ts |
| `onBrowserOpenTab` | event | `lazify:browser-open-tab` | src/main/main.ts |
| `onBrowserPopupBlocked` | event | `lazify:browser-popup-blocked` | src/main/main.ts |
| `allowPopupsFrom` | request | `lazify:allow-popups-from` | src/main/ipc/browser.ts |

### `code-intelligence` — `src/preload/api/code-intelligence.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `findSymbolDefinition` | request | `lazify:find-symbol-definition` | src/main/ipc/code-intelligence.ts |

### `dmg` — `src/preload/api/dmg.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `selectAppBundle` | request | `lazify:select-app-bundle` | src/main/ipc/dmg.ts |
| `selectDmgDestination` | request | `lazify:select-dmg-destination` | src/main/ipc/dmg.ts |
| `inspectAppBundle` | request | `lazify:inspect-app-bundle` | src/main/ipc/dmg.ts |
| `defaultDmgPath` | request | `lazify:default-dmg-path` | src/main/ipc/dmg.ts |
| `selectDmgImage` | request | `lazify:select-dmg-image` | src/main/ipc/dmg.ts |
| `dmgImagePreview` | request | `lazify:dmg-image-preview` | src/main/ipc/dmg.ts |
| `compileDmg` | request | `lazify:compile-dmg` | src/main/ipc/dmg.ts |
| `onDmgProgress` | event | `lazify:dmg-progress` | src/main/ipc/dmg.ts |

### `env` — `src/preload/api/env.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listEnvFiles` | request | `lazify:list-env-files` | src/main/ipc/env.ts |
| `readEnvFile` | request | `lazify:read-env-file` | src/main/ipc/env.ts |
| `updateEnvVariable` | request | `lazify:update-env-variable` | src/main/ipc/env.ts |
| `deleteEnvVariable` | request | `lazify:delete-env-variable` | src/main/ipc/env.ts |
| `addEnvVariable` | request | `lazify:add-env-variable` | src/main/ipc/env.ts |
| `createEnvFile` | request | `lazify:create-env-file` | src/main/ipc/env.ts |

### `environment` — `src/preload/api/environment.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `checkEnvironment` | request | `lazify:environment` | src/main/ipc/environment.ts |
| `scanTools` | request | `lazify:scan-tools` | src/main/ipc/environment.ts |
| `probeTool` | request | `lazify:probe-tool` | src/main/ipc/environment.ts |
| `nvmListVersions` | request | `lazify:nvm-list-versions` | src/main/ipc/environment.ts |
| `installNvm` | request | `lazify:install-nvm` | src/main/ipc/environment.ts |
| `nvmSetDefault` | request | `lazify:nvm-set-default` | src/main/ipc/environment.ts |
| `nvmUse` | request | `lazify:nvm-use` | src/main/ipc/environment.ts |
| `installTool` | request | `lazify:install-tool` | src/main/ipc/environment.ts |
| `uninstallTool` | request | `lazify:uninstall-tool` | src/main/ipc/environment.ts |
| `checkToolUpdate` | request | `lazify:check-tool-update` | src/main/ipc/environment.ts |
| `updateTool` | request | `lazify:update-tool` | src/main/ipc/environment.ts |
| `listListeningProcesses` | request | `lazify:listening-processes` | src/main/ipc/system.ts |
| `killListeningProcess` | request | `lazify:kill-listening-process` | src/main/ipc/system.ts |

### `extensions` — `src/preload/api/extensions.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listExtensions` | request | `lazify:list-extensions` | src/main/ipc/extensions.ts |
| `installExtension` | request | `lazify:install-extension` | src/main/ipc/extensions.ts |
| `extensionInstallJobs` | request | `lazify:extension-install-jobs` | src/main/ipc/extensions.ts |
| `removeExtension` | request | `lazify:remove-extension` | src/main/ipc/extensions.ts |
| `toggleExtension` | request | `lazify:toggle-extension` | src/main/ipc/extensions.ts |
| `writeExtensionManifest` | request | `lazify:write-extension-manifest` | src/main/ipc/extensions.ts |
| `onExtensionInstall` | event | `lazify:extension-install` | src/main/ipc/extensions.ts |

### `formatting` — `src/preload/api/formatting.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `formatterSettings` | request | `lazify:formatter-settings` | src/main/ipc/formatting.ts |
| `setFormatterMode` | request | `lazify:set-formatter-mode` | src/main/ipc/formatting.ts |
| `setOrganizeImports` | request | `lazify:set-organize-imports` | src/main/ipc/formatting.ts |
| `setFormatterDefaults` | request | `lazify:set-formatter-defaults` | src/main/ipc/formatting.ts |
| `formatSample` | request | `lazify:format-sample` | src/main/ipc/formatting.ts |
| `projectFormatter` | request | `lazify:project-formatter` | src/main/ipc/formatting.ts |
| `formatChangedFiles` | request | `lazify:format-changed-files` | src/main/ipc/formatting.ts |
| `onCodeFormatted` | event | `lazify:code-formatted` | src/main/main.ts |

### `git` — `src/preload/api/git.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `getProjectGitStatus` | request | `lazify:project-git-status` | src/main/ipc/git.ts |
| `getWorkingChanges` | request | `lazify:working-changes` | src/main/ipc/git.ts |
| `getFileDiff` | request | `lazify:file-diff` | src/main/ipc/git.ts |
| `checkoutBranch` | request | `lazify:checkout-branch` | src/main/ipc/git.ts |
| `stageFiles` | request | `lazify:stage-files` | src/main/ipc/git.ts |
| `unstageFiles` | request | `lazify:unstage-files` | src/main/ipc/git.ts |
| `discardChanges` | request | `lazify:discard-changes` | src/main/ipc/git.ts |
| `commitChanges` | request | `lazify:commit-changes` | src/main/ipc/git.ts |
| `pushBranch` | request | `lazify:push-branch` | src/main/ipc/git.ts |
| `pullBranch` | request | `lazify:pull-branch` | src/main/ipc/git.ts |

### `linting` — `src/preload/api/linting.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `lintFile` | request | `lazify:lint-file` | src/main/ipc/linting.ts |
| `createFixTask` | request | `lazify:create-fix-task` | src/main/ipc/linting.ts |
| `startSonarScan` | request | `lazify:start-sonar-scan` | src/main/ipc/linting.ts |
| `stopSonarScan` | request | `lazify:stop-sonar-scan` | src/main/ipc/linting.ts |
| `sonarScanState` | request | `lazify:sonar-scan-state` | src/main/ipc/linting.ts |
| `createPhaseTasks` | request | `lazify:create-phase-tasks` | src/main/ipc/linting.ts |
| `onSonarScan` | event | `lazify:sonar-scan` | src/main/ipc/linting.ts |

### `media` — `src/preload/api/media.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `openPictureInPicture` | request | `lazify:open-picture-in-picture` | src/main/ipc/media.ts |
| `closePictureInPicture` | request | `lazify:close-picture-in-picture` | src/main/ipc/media.ts |
| `getPictureInPictureState` | request | `lazify:picture-in-picture-state` | src/main/ipc/media.ts |
| `onPictureInPictureChanged` | event | `lazify:picture-in-picture-changed` | src/main/main.ts |
| `toggleMediaPictureInPicture` | request | `lazify:toggle-media-picture-in-picture` | src/main/ipc/media.ts |

### `packages` — `src/preload/api/packages.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `searchNpmPackages` | request | `lazify:search-npm-packages` | src/main/ipc/templates.ts |
| `getNpmOutdated` | request | `lazify:npm-outdated` | src/main/ipc/projects.ts |
| `getNpmAudit` | request | `lazify:npm-audit` | src/main/ipc/projects.ts |
| `listProjectPackages` | request | `lazify:list-project-packages` | src/main/ipc/packages.ts |
| `addProjectPackage` | request | `lazify:add-project-package` | src/main/ipc/packages.ts |
| `removeProjectPackage` | request | `lazify:remove-project-package` | src/main/ipc/packages.ts |
| `installProjectDependencies` | request | `lazify:install-project-dependencies` | src/main/ipc/packages.ts |
| `matchPackageVersions` | request | `lazify:match-package-versions` | src/main/ipc/packages.ts |
| `fixProjectPackageVersions` | request | `lazify:fix-project-package-versions` | src/main/ipc/packages.ts |

### `projects` — `src/preload/api/projects.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `importProjectFromDirectory` | request | `lazify:import-project-from-directory` | src/main/ipc/projects.ts |
| `importProjectIndexFromDirectory` | request | `lazify:import-project-index-from-directory` | src/main/ipc/projects.ts |
| `readImportedProjectFile` | request | `lazify:read-imported-project-file` | src/main/ipc/projects.ts |
| `readProjectAssetFile` | request | `lazify:read-project-asset-file` | src/main/ipc/projects.ts |
| `searchProject` | request | `lazify:search-project` | src/main/ipc/projects.ts |

### `prompts` — `src/preload/api/prompts.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listPromptPresets` | request | `lazify:list-prompt-presets` | src/main/ipc/prompts.ts |
| `createPromptPreset` | request | `lazify:create-prompt-preset` | src/main/ipc/prompts.ts |
| `updatePromptPreset` | request | `lazify:update-prompt-preset` | src/main/ipc/prompts.ts |
| `deletePromptPreset` | request | `lazify:delete-prompt-preset` | src/main/ipc/prompts.ts |
| `listContextEntries` | request | `lazify:list-context-entries` | src/main/ipc/prompts.ts |
| `createContextEntry` | request | `lazify:create-context-entry` | src/main/ipc/prompts.ts |
| `updateContextEntry` | request | `lazify:update-context-entry` | src/main/ipc/prompts.ts |
| `setContextEntryActive` | request | `lazify:set-context-entry-active` | src/main/ipc/prompts.ts |
| `setContextPackActive` | request | `lazify:set-context-pack-active` | src/main/ipc/prompts.ts |
| `deleteContextEntry` | request | `lazify:delete-context-entry` | src/main/ipc/prompts.ts |
| `buildPrompt` | request | `lazify:build-prompt` | src/main/ipc/prompts.ts |
| `suggestPromptPreset` | request | `lazify:suggest-prompt-preset` | src/main/ipc/prompts.ts |

### `scripts` — `src/preload/api/scripts.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listScripts` | request | `lazify:list-scripts` | src/main/ipc/scripts.ts |
| `runScript` | request | `lazify:run-script` | src/main/ipc/scripts.ts |
| `stopScript` | request | `lazify:stop-script` | src/main/ipc/scripts.ts |
| `restartScript` | request | `lazify:restart-script` | src/main/ipc/scripts.ts |
| `listSessions` | request | `lazify:list-sessions` | src/main/ipc/scripts.ts |
| `ptyWrite` | send (fire-and-forget) | `lazify:pty-write` | src/main/ipc/scripts.ts |
| `ptyBacklog` | request | `lazify:pty-backlog` | src/main/ipc/scripts.ts |
| `ptyResize` | send (fire-and-forget) | `lazify:pty-resize` | src/main/ipc/scripts.ts |
| `onPtyData` | event | `lazify:pty-data` | src/main/ipc/scripts.ts, src/main/main.ts |
| `onScriptStatus` | event | `lazify:script-status` | src/main/ipc/scripts.ts, src/main/main.ts |
| `onSessionKilled` | event | `lazify:session-killed` | src/main/ipc/scripts.ts |

### `system` — `src/preload/api/system.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `platform` | value | — | preload only |
| `runCommand` | request | `lazify:run-command` | src/main/ipc/workflow.ts |
| `chooseCommandOption` | request | `lazify:choose-command-option` | src/main/ipc/workflow.ts |
| `relaunchApp` | request | `lazify:relaunch` | src/main/ipc/environment.ts |
| `signalRendererReady` | send (fire-and-forget) | `lazify:renderer-ready` | src/main/main.ts |
| `selectDirectory` | request | `lazify:select-directory` | src/main/ipc/projects.ts |
| `selectDirectories` | request | `lazify:select-directories` | src/main/ipc/projects.ts |
| `selectPaths` | request | `lazify:select-paths` | src/main/ipc/projects.ts |
| `getDiagnosticsPaths` | request | `lazify:diagnostics-paths` | src/main/ipc/system.ts |
| `saveClipboardImage` | request | `lazify:save-clipboard-image` | src/main/ipc/agents.ts |
| `pathForDroppedFile` | value | — | preload only |
| `listHighlightingAssets` | request | `lazify:highlighting-assets` | src/main/ipc/code-intelligence.ts |
| `openHighlightingFolder` | request | `lazify:open-highlighting-folder` | src/main/ipc/code-intelligence.ts |
| `revealInFileManager` | request | `lazify:reveal-in-file-manager` | src/main/ipc/system.ts |
| `detectEditors` | request | `lazify:detect-editors` | src/main/ipc/system.ts |
| `openInEditor` | request | `lazify:open-in-editor` | src/main/ipc/system.ts |
| `openTerminal` | request | `lazify:open-terminal` | src/main/ipc/system.ts |
| `openExternalUrl` | request | `lazify:open-external-url` | src/main/ipc/browser.ts |
| `chooseUploadFile` | request | `lazify:choose-upload-file` | src/main/ipc/api-studio.ts |
| `readZoom` | request | `lazify:read-zoom` | src/main/ipc/system.ts |
| `setZoom` | request | `lazify:set-zoom` | src/main/ipc/system.ts |
| `stepZoom` | request | `lazify:step-zoom` | src/main/ipc/system.ts |
| `resetZoom` | request | `lazify:reset-zoom` | src/main/ipc/system.ts |
| `onZoomChanged` | event | `lazify:zoom-changed` | src/main/window-zoom.ts |
| `onLog` | event | `lazify:log` | src/main/main.ts |
| `onCommandChoicePrompt` | event | `lazify:command-choice-prompt` | src/main/main.ts |

### `tasks` — `src/preload/api/tasks.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listTasks` | request | `lazify:list-tasks` | src/main/ipc/tasks.ts |
| `listAllTasks` | request | `lazify:list-all-tasks` | src/main/ipc/tasks.ts |
| `createTask` | request | `lazify:create-task` | src/main/ipc/tasks.ts |
| `updateTask` | request | `lazify:update-task` | src/main/ipc/tasks.ts |
| `setTaskStatus` | request | `lazify:set-task-status` | src/main/ipc/tasks.ts |
| `listTaskStatusEvents` | request | `lazify:list-task-status-events` | src/main/ipc/tasks.ts |
| `reorderTask` | request | `lazify:reorder-task` | src/main/ipc/tasks.ts |
| `deleteTask` | request | `lazify:delete-task` | src/main/ipc/tasks.ts |
| `buildTaskPrompt` | request | `lazify:build-task-prompt` | src/main/ipc/tasks.ts |
| `recordTaskRun` | request | `lazify:record-task-run` | src/main/ipc/tasks.ts |
| `listTaskRuns` | request | `lazify:list-task-runs` | src/main/ipc/tasks.ts |
| `completeTaskRun` | request | `lazify:complete-task-run` | src/main/ipc/tasks.ts |
| `completeAgentTaskRuns` | request | `lazify:complete-agent-task-runs` | src/main/ipc/tasks.ts |

### `templates` — `src/preload/api/templates.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `listTemplates` | request | `lazify:templates` | src/main/ipc/templates.ts |
| `listImportedTemplates` | request | `lazify:imported-templates` | src/main/ipc/templates.ts |
| `getImportedTemplate` | request | `lazify:imported-template` | src/main/ipc/templates.ts |
| `updateImportedTemplate` | request | `lazify:update-imported-template` | src/main/ipc/templates.ts |
| `deleteImportedTemplate` | request | `lazify:delete-imported-template` | src/main/ipc/templates.ts |
| `getTemplatePackageManifest` | request | `lazify:template-package-manifest` | src/main/ipc/templates.ts |
| `saveImportedTemplate` | request | `lazify:save-imported-template` | src/main/ipc/templates.ts |

### `updater` — `src/preload/api/updater.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `getUpdateState` | request | `lazify:update-state` | src/main/ipc/updater.ts |
| `checkForUpdates` | request | `lazify:check-for-updates` | src/main/ipc/updater.ts |
| `downloadUpdate` | request | `lazify:download-update` | src/main/ipc/updater.ts |
| `quitAndInstallUpdate` | request | `lazify:quit-and-install-update` | src/main/ipc/updater.ts |
| `onUpdateStateChanged` | event | `lazify:update-state-changed` | src/main/main.ts |

### `workflow` — `src/preload/api/workflow.ts`

| Member | Kind | Channel | Main-side handler |
| --- | --- | --- | --- |
| `createProject` | request | `lazify:create-project` | src/main/ipc/workflow.ts |
| `installPackage` | request | `lazify:install-package` | src/main/ipc/workflow.ts |
| `onWorkflowProgress` | event | `lazify:workflow-progress` | src/main/main.ts |
