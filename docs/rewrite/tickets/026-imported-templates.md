# 026 — Imported templates (Phase 5 / Done)

**Read this whole ticket before touching code.** Saving a project as a
template, listing, editing and deleting templates, and creating a
project from one, on Chain: the five `templates` members still stubbed
since ticket 015, and `createProject` with `sourceMode: "imported"`,
which ticket 025 left rejecting.

## Goal

The Templates screens work as in Electron:

- **Save as template:** from a picked project and the files the user
  ticked, build a template: walk the project honouring `.gitignore` at
  every level and Electron's default ignores, keep text content for safe
  extensions up to 50 KB, store binaries and large files as references,
  leave `.env*` files out with a warning, detect the stack (or take the
  one the user confirmed), file and folder roles, and features.
- **List, open, rename/edit the tree, delete**, with the same ids, default
  names (`laz-temp-001`, …), unique-id suffixes and error messages.
- **Create a project from a template:** write the template's tree into
  `<workspace>/<name>`, replacing Electron's replaceable root folders,
  merging `package.json` into one already there, then install with the
  project's package manager when there is a `package.json`.

Templates saved by Electron and copied over by the first-launch import
(ticket 012) open unchanged, including the legacy shape with only a UI
`tree`.

## Status — 2026-10-14

Done on macOS. 17 of 17 golden results recorded from Electron match, and
Electron's four `tree-reconciler` tests pass on the copy. In the running
app, through the bridge, a template was saved from the Electron repo
(1,310 files walked), opened, renamed, a project created from it and the
template deleted; Electron's own code gives the same template for the
same input. Left: clicking through the Templates screens.

## Source-of-truth references

- Roadmap row: Phase 5 "imported templates"
- Old source: `src/brain/template-engine/*` (types, import-project,
  save-template, normalize-structure, validate-template, detect-features,
  detect-file-role, detect-folder-role), `src/brain/resources/{content-rules,import-rules}.ts`,
  `src/main/scaffolding/imported-template-store.ts`,
  `src/main/scaffolding/tree-reconciler.ts`,
  `src/main/scaffolding/workflow/prepare.ts` (`createProjectFromImportedTemplate`),
  `src/main/scaffolding/workflow/create.ts`, `src/main/ipc/templates.ts`
- Public API: `templates.listImportedTemplates`, `getImportedTemplate`,
  `updateImportedTemplate`, `deleteImportedTemplate`,
  `saveImportedTemplate` in [`../02-contract-manifest.md`](../02-contract-manifest.md);
  `workflow.createProject` (imported mode). `importProjectFromDirectory`
  (the picker's tree) is already on Chain (ticket 009)
- Old tests: `tests/main/tree-reconciler.test.ts`. Nothing else covers
  the store or the engine, so a characterisation fixture is added
- Persistent data touched: `<appData>/imported-templates/<id>.json`, the
  same file per template Electron keeps under `userData`, and where
  ticket 012 copies them
- Required OS behaviour: none beyond `folders`; npm/yarn for the install
  after creating

## Current observable behaviour (Electron)

- `saveImportedTemplate(projectPath, includedRelativePaths, name?, stack?)`
  returns the stored snapshot. No name → `laz-temp-NNN`, one past the
  highest existing. The id is the name's slug, `-2`, `-3`… when taken.
  A path that isn't a folder throws "The selected path is not a
  directory." Warnings for env files, large and binary files are
  added to `stackDetection.warnings`.
- `listImportedTemplates()` returns options newest first.
  `getImportedTemplate` / `deleteImportedTemplate` throw
  `Imported template "<id>" was not found.` A template file that isn't
  JSON makes `list` reject.
- `updateImportedTemplate(id, { name?, tree? })` recomputes files,
  folders, features, tags, counts and description, validates, and
  writes. A blank name keeps the old one.
- `createProject` (imported): no id → "Select an imported template
  before creating the project."; progress `preflight`, `create-project`,
  `install-dependencies` (when there is a `package.json`), `complete`.
  An install failure returns `success: false` with the project path and
  leaves the project. No staging folder, no git init, and an existing
  destination is written into, not refused.

## Target boundary

- `src/brain/template-engine/*` and its two resource files are copied to
  `src/shared/lib/template-engine/`. Only `import-project.ts` and
  `save-template.ts` touch the disk:
  - the walk is one recursive `listFolderTree` skipping the default
    ignored folders, then `.gitignore` rules applied in memory exactly
    as Electron's per-folder `readdir` does (same rule order, same
    inheritance). Symlinks and other entries are skipped, as Electron's
    `Dirent.isFile()`/`isDirectory()` do;
  - file contents through `readFileBytes` (size from the listing), the
    same NUL-byte check and UTF-8 decode;
  - stack detection through ticket 002's `ProjectReader` copy.
- `imported-template-store.ts` → `src/shared/lib/scaffolding/`, files
  under `appDataPath()/imported-templates` through `src/platform/folders.ts`.
- `tree-reconciler.ts` → `src/shared/lib/scaffolding/`, writes through
  `src/platform/folders.ts`.
- `createProjectFromImportedTemplate` added to the Chain `prepare.ts`,
  routed from `create.ts` as in Electron.
- Bridge: the five members move from `rejects(unported.templates)` to
  `src/platform/workflow.ts`.
- Trust boundary: the source project and the destination must be inside
  a granted folder; Chain's `NOT_GRANTED` is shown as is.

## Acceptance checklist and evidence

- [x] Electron's `tree-reconciler.test.ts` passes on the copy
      (`tests/shared/lib/scaffolding/tree-reconciler.test.ts`, 4)
- [x] Golden fixture recorded from Electron (`../scripts/templates-recorder/`,
      17 snapshots; steps in `tests/shared/lib/scaffolding/templates.cases.ts`):
      save (full selection, partial selection, nested `.gitignore` with
      negation, env files, binary and large files, a symlink, a confirmed
      stack that differs from the detected one, a default name, a taken
      id), list, get, update (rename, tree edit, blank name), delete,
      missing ids, a legacy snapshot, and create from a template (with
      and without `package.json`, install failing, existing `package.json`
      merged, replaceable roots replaced, no id). The Chain copy matches
      all 17
- [x] `CI=true npm test` (508 passed, 9 skipped), `npm run typecheck`
      and `npm run build:web` pass
- [x] In the app (`chain dev`, `chain inspect`), through the bridge:
      `saveImportedTemplate` on `~/Work/lazify` with three files plus a
      ticked `.env` and `node_modules/x` (left out) in 654 ms; list, get,
      rename; `createProject` (imported) into the app's temp folder in
      391 ms with `preflight`, `create-project`, `complete`; delete, then
      "not found". Electron's store on the same repo and selection gives
      the same files, count (1,310), stack and paths
- [ ] The Templates screens clicked through
- [ ] A template saved by Electron opens after the first-launch import
      (Electron's `imported-templates/` is empty on this Mac; the legacy
      shapes are in the fixture)
- [ ] Windows (D-2)

## Differences from Electron

- **Stack detection** is ticket 002's (different by design), so a
  project's detection warnings can differ: on the Electron repo, Electron
  also lists `react-next` as an indicator. The fixture project has no
  plain `react` dependency so the template engine is compared on its own.
- **Saving is slower**: ~650 ms against Electron's ~170 ms for the same
  real repo, from the listing and each file read crossing to the native
  side. One recursive listing replaces a `readdir` per folder; the file
  reads stay one per selected file.

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the members go back to their stubs and imported mode
rejects again.

## Open questions

- Electron's `.gitignore` handling drops a leading `/`, so `/name` also
  ignores `name` in every subfolder (the fixture's `app/root-only.ts`).
  Kept for parity; worth fixing in both, or here as a deliberate
  difference.

## Keeping the two copies in step

To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/templates-recorder
```

Move the snapshot it writes over
`tests/shared/lib/scaffolding/__snapshots__/templates.golden.test.ts.snap`,
then check with `CI=true npm test`.

## Verification log

- 2026-10-14, macOS 27.0.1 arm64, Node 22.23.2: fixture recorded from
  Electron at `c9abefc`, copy matches; the app run above (dev build
  running, frontend hot-reloaded). The template and the scratch project
  were removed afterwards.
