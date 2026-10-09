# 022 — Packages (Phase 5 / Done)

**Read this whole ticket before touching code.** The `packages` group on
Chain: list a project's packages, add, remove, install, check outdated
and audit, search npm, and fix versions. `matchPackageVersions` is
already on Chain (ticket 003).

## Goal

The Packages screens and the dependency health pane work on Chain as in
Electron, including their failure paths: npm exiting non-zero with JSON
on stdout, npm's `{ error }` object, the npm auto-fix retry
(`--legacy-peer-deps`, yarn's `--ignore-engines`), and search falling
back from the registry to the npm CLI.

## Source-of-truth references

- Roadmap row: Phase 5, "packages … project health"
- Old source: `src/main/ipc/packages.ts`,
  `src/main/projects/project-health.ts`,
  `src/main/scaffolding/npm-registry.ts`,
  `src/main/scaffolding/harmonizer.ts` (the command builders),
  `src/main/scaffolding/workflow/{packages,installers,paths}.ts`,
  `src/main/scaffolding/workflow-engine.ts` (its context), `main.ts`
  (`lazify:workflow-progress`)
- Public API: `packages` in [`../02-contract-manifest.md`](../02-contract-manifest.md),
  and `onWorkflowProgress`
- Old tests: **none** for these (only the renderer's
  `package-search-picker-utils`). Characterisation fixture added, as in
  ticket 003
- Persistent data touched: the project's `package.json` and lockfile,
  through npm or yarn

## Target boundary

- Copied, imports changed: `harmonizer.ts`'s four command builders
  (`listTemplates`/`getTemplate` wait for the catalog, ticket 025),
  `installers.ts`, `packages.ts`, `paths.ts`, `npm-registry.ts`,
  `project-health.ts`.
- Changed to fit Chain, nothing else:
  - `fs.existsSync(path)` → `await pathExists(path)` (Chain's `exists`).
  - `choosePackageManager(projectPath)` →
    `choosePackageManager(projectReader(projectPath))`, the ported
    signature (ticket 005).
  - `resolveUserPath` reads `HOME` through Chain, so it's async.
  - `fetch` → `desktop.http` (`src/platform/http.ts`); `execFile` →
    `@/platform/exec` (Chain's process runner). Electron's
    `shell: win32` is dropped: macOS only (D-2).
- `src/platform/workflow.ts`: Electron's `WorkflowEngine` context
  (`commandRunner`, `emitProgress`) and `onWorkflowProgress`. Ticket 025
  adds project creation to it.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from Electron's code
      (`../scripts/packages-recorder/`, 19 snapshots): command sequences,
      progress events and results for add, remove, install and install
      packages, with npm, yarn and no lockfile, success, auto-fix and
      missing project; outdated and audit over clean, issues (npm exits 1
      with JSON), `{ error }` and npm failing; search over the registry,
      the CLI fallback, both failing and a too-short query. The copy
      matches all 19 (`tests/shared/lib/packages/`). A deliberate change
      to npm's uninstall verb failed the fixture, then was reverted
- [x] In the app, against the real npm, on a scratch project in the
      app's temp folder: list, install, add `is-odd@3.0.1`, outdated
      (`is-number` 6 → 7), audit (0 of 2), remove, search, and fix
      versions ("All packages are already compatible."), with progress
      events in order. Scratch project deleted afterwards
- [x] The Workspace's Dependencies pane on lazify lists 48 packages (20
      and 28 dev), matching its `package.json`
- [x] `CI=true npm test` (392 passed) and `npm run typecheck` pass

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Rollback

Revert the commit; the members go back to their stubs.

## Keeping the two copies in step

Until the Electron app is retired, a change to these files in either repo
must be made in both. To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/packages-recorder
```

Move the snapshot it writes over
`tests/shared/lib/packages/__snapshots__/packages.golden.test.ts.snap`
(only the file name differs), then check with `CI=true npm test`.

## Verification log

- 2026-10-10, macOS arm64: fixture recorded from Electron, copy matches;
  the app run above through `chain inspect`.
