# 002 — Stack detection (Phase 1 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: the
ported detection reproduces the Electron app's results for 19 of 28 project
folders, and deliberately improves the other 9 (see "Different by design").
It reads real project folders through Chain's `desktop.folders`.

## Goal

Port the Electron app's project stack detection into this repo (A-4: copy,
proven by golden fixtures). The Electron app is not changed. Projects, API
Studio and templates use it to label a project (Vite, Next.js, Expo, .NET,
Swift and so on) and to suggest its install, dev, build and test commands.

## Status — 2026-10-09

- Ported to `src/shared/lib/stack-detection/` (this repo). It lives in
  `shared` because projects, API Studio and templates all use it.
- `tests/shared/lib/stack-detection/stack-detection.golden.test.ts` passes
  against a fixture **recorded from the Electron code** at baseline
  `c9abefc`: 28 cases covering every JavaScript stack, .NET (ASP.NET, Blazor,
  MAUI, F#, a solution with no project, a vendored sample), Swift (package,
  SwiftUI, UIKit with CocoaPods, a loose file), invalid `package.json` and an
  empty folder.
- Electron's `command-builder` and `package-json-reader` tests are ported.
- `src/platform/folders.ts` provides `projectReader(root)`, a
  `ProjectReader` over `desktop.folders` (shipped for
  [request 01](../../chain-sdk-requests/01-project-folder-access.md)). A
  missing file (`NOT_FOUND`) reads as `null`; every other error is passed
  on. Callers need a folder grant covering `root`.

## Source-of-truth references

- Roadmap row: Projects (stack detection on import).
- Electron source (unchanged), `src/brain/stack-detection/`: `types.ts`,
  `package-manager-detector.ts`, `command-builder.ts`, `file-detector.ts`,
  `package-json-reader.ts`, `dotnet-detector.ts`, `swift-detector.ts`,
  `detect-stack.ts`.
- Electron callers: `src/main/projects/project-importer.ts`,
  `project-importer-optimized.ts`, `src/main/api-studio/project-inventory.ts`,
  `src/brain/template-engine/save-template.ts`.
- Electron tests: `tests/brain/command-builder.test.ts`,
  `tests/brain/package-json-reader.test.ts`.
- Persistent data touched: none. Detection only reads the project folder.

## What changed in the copy, and why

`types.ts`, `package-manager-detector.ts` and `command-builder.ts` are
byte-identical. The other five read files through Node's `fs` and `path`,
which the Chain webview does not have:

- **New `project-reader.ts`.** A `ProjectReader` with `exists`, `list` and
  `readText`, taking paths relative to the project root. It matches what
  request 01 asks Chain for. `joinPath`, `baseName` and `extensionOf` stand
  in for Node's `path.posix.join`, `path.basename` and `path.extname`.
- The detectors take a `ProjectReader` instead of a root path. Every other
  line, including the comments, is unchanged.
- `readPackageJson` tells a missing file from an unreadable one by
  `readText` resolving to `null`, instead of checking for `ENOENT`. The
  warnings are the same.

## Different by design (approved by the owner, 2026-10-09)

The Electron fixture showed that Vite, Create React App and bare React
projects were detected as **Next.js**, and a React Native CLI app as
**Expo**. The Next.js candidate counted a plain `react` dependency as
evidence, Expo counted `react-native`, and both outrank the stacks that
should win. The owner asked for detection to be improved here; the Electron
app keeps its behaviour (A-3).

Changes in `detect-stack.ts`, `file-detector.ts`,
`package-manager-detector.ts` and `package-json-reader.ts`:

- **A stack needs identifying evidence to become a candidate.** Next.js:
  the `next` dependency or a `next.config.*`. Vite: `vite`,
  `@vitejs/plugin-react` or a `vite.config.*`. Expo: `expo`, `expo-router`,
  `app.config.*` or `expo-env.d.ts`. React Native CLI: `react-native`
  without `expo`. Electron: an Electron, electron-builder or Electron Forge
  dependency, or `electron-builder.json`. Supporting signals (`react`,
  `react-dom`, `app/`, `pages/`, `app.json`, `metro.config.js`, the
  `electron/` folder, a `main` entry) are still listed as reasons but no
  longer create a candidate on their own. Confidence values are unchanged.
- **`package.json`'s `packageManager` field wins** over lock files when it
  names npm, Yarn, pnpm or Bun, as Corepack does.
- **New markers:** `vite.config.mts`, `vite.config.cts`,
  `@electron-forge/cli`, and `index.html`. Electron checked `index.html`
  but never looked for it, so that reason could not appear.

Nine of the 28 golden cases change, all listed in `DIFFERENT_BY_DESIGN` in
`stack-detection.cases.ts`. The golden test skips them, so the Electron
fixture stays exactly as recorded, as the record of the old behaviour.
`stack-detection.enhanced.test.ts` pins the new result for each, plus the
new signals.

Not changed: a Vite project using Vue or Svelte is still labelled
`react-vite`, because `ProjectStack` has no non-React web stacks. Adding
them changes the type every caller switches on, so it belongs with the
projects screens.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from the Electron code, not from the copy. The
      recorder (`../scripts/stack-detection-recorder/`) ran Electron's
      `detectProjectStack` on real temporary folders built from
      `stack-detection.cases.ts`
- [x] `CI=true npm test` passes (70 tests, the 9 changed golden cases skipped)
- [x] Every different-by-design case has an explicit expected result in
      `stack-detection.enhanced.test.ts`
- [x] Mutation check: changing one reason string fails the matching case
- [x] `npm run typecheck` passes; `vite build` succeeds
- [x] Electron app untouched (`git status` clean)
- [x] Six real project folders detected through `desktop.folders` in the
      running app, matching Electron except for the approved differences

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Keeping the two copies in step

Until the Electron app is retired, a change to stack detection in either repo
must be made in both, except for the differences listed above, which exist
only here. To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/stack-detection-recorder
```

It runs Electron's `detectProjectStack` (from `../lazify`) on real temporary
folders built from `stack-detection.cases.ts`. Copy the snapshot it writes
over `tests/shared/lib/stack-detection/__snapshots__/stack-detection.golden.test.ts.snap`
(only the file name differs), delete the recorder's `__snapshots__/`, then
check with `CI=true npm test`.

## Verification log

- 2026-10-09, macOS arm64. The recorder wrote 28 snapshots from Electron at
  `c9abefc`. Copied into this repo, `CI=true npx vitest run` gave 60 of 60
  passing. A mutated reason string failed 1 case as expected and was
  reverted.
- 2026-10-09, macOS arm64. Detection improved (see "Different by design").
  `CI=true npx vitest run`: 70 passed, 9 skipped. The Electron fixture file
  is unchanged.
- 2026-10-09, macOS arm64, `chain dev` with six of the owner's projects
  temporarily declared read-only in `package.json` (reverted afterwards).
  `detectProjectStack(projectReader(path))` was run in the app through
  `chain inspect`, and Electron's `detectProjectStack` on the same folders
  in Node. lazify (Electron), chain-sdk (unknown), Infinity_MobileApp (Expo)
  and Infinity_Health_Api (ASP.NET) match. lazify-chain and mneme are Vite
  apps: Chain says `react-vite` 0.95, Electron said `react-next` 0.85 with
  `npx next start`. 15–53 ms per project.
