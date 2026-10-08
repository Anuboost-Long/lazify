# 009 — Projects: tree, files, search, pickers (Phase 2 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: the
`projects` group builds a project's file tree, reads files and assets, and
searches a project through `desktop.folders`, matching Electron's results.

## Goal

Rebuild the Electron app's `projects` preload group (`importProjectFromDirectory`,
`importProjectIndexFromDirectory`, `readImportedProjectFile`,
`readProjectAssetFile`, `searchProject`) and the `system` group's folder
pickers (`selectDirectory`, `selectDirectories`, `selectPaths`) on Chain.

## Status — 2026-10-09

- Ported to `src/shared/lib/projects/`: `project-importer-optimized.ts`,
  `project-importer.ts`, `project-asset-reader.ts`, `project-search/*`.
  `src/shared/types/project-tree.ts` and `templates.ts` are the renderer's
  types files, copied verbatim.
- `src/platform/projects.ts` exposes the group and the pickers.
- New `src/platform/fs.ts`: the small part of `fs/promises` these modules
  use (`readFile`, `readdir` with file types, `stat`) over
  `desktop.folders`, with Node's error codes and messages. New
  `src/shared/lib/path.ts`: Node's POSIX `path` functions, tested equal to
  Node's. With both, the copies change only their imports.
- Electron's own tests for the asset reader and search pass on the copy;
  the importers are pinned by a fixture recorded from Electron.

## Source-of-truth references

- Roadmap rows: Projects, Workspace files.
- Electron source (unchanged): `src/main/ipc/projects.ts`,
  `src/main/projects/project-importer*.ts`, `project-asset-reader.ts`,
  `project-search/*`, `src/preload/api/projects.ts`,
  `src/preload/api/system.ts` (pickers).
- Electron tests: `tests/main/project-asset-reader.test.ts`,
  `tests/main/projects/project-search.test.ts`, ported with import paths
  changed and `@chain/sdk` pointed at a Node-backed `desktop.folders`
  (`tests/platform/node-folders.ts`) that behaves like Chain's.

## What changed in the copy, and why

- Imports only: `node:fs/promises` becomes `@/platform/fs`, `node:path`
  becomes `@/shared/lib/path`, and `detectProjectStack(path)` becomes
  `detectProjectStack(projectReader(path))` (ticket 002). `Buffer` as a
  parameter type becomes `Uint8Array`.
- `src/platform/fs.ts` maps Chain's errors to Node's (`NOT_FOUND` to
  `ENOENT` and so on) and builds Node's message
  (`ENOENT: no such file or directory, stat '<path>'`), because the UI
  shows these messages to the user.
- Chain's `stat` doesn't follow a final symlink; Node's does. Project paths
  come from the picker already resolved, so this only matters for a
  symlink inside a project, which both walkers skip anyway.
- **Pickers:** `desktop.folders.pick` has no title, no starting folder and
  no "New Folder" option, so Electron's titles and `selectPaths`'
  `defaultPath` are dropped. The picked paths are canonical and granted.

## Performance: folder snapshots

Every `desktop.folders` call is a round trip to native, about 2 ms in
sequence. Electron's walkers call `readdir` once per folder and `stat` once
per file, so on this repository a search took 2.5 s through Chain, against
48 ms in Electron, with identical results (718 folder listings, mostly a
git-ignored build folder that Electron's walker enters too; see below).

`src/platform/projects.ts` wraps `searchProject` and
`importProjectIndexFromDirectory` in `withFolderSnapshot`: one recursive
`desktop.folders.list` of the project, skipping the folders the walkers
always skip (`node_modules`, `.git` and the rest of
`IGNORED_DIRECTORY_NAMES`). For the duration of that one call, `readdir`
and `stat` inside the project are answered from the snapshot; anything else
still goes to Chain. The copied walkers are unchanged. Tests show the
wrapped and unwrapped search return the same result, with one listing and
no `stat` calls instead of one listing per folder, and the importer
fixture from Electron still matches through the wrapper. If the path can't
be listed, the snapshot steps aside and Electron's own error comes back.

Search result order follows directory order, as in Electron; Chain and
Node read directories with the same system call.

## Electron behaviour carried over, for the owner to decide

Confirmed by running Electron's own code:
- **Search ignores nested `.gitignore` files.** Only the root one applies,
  so `src/deep/.gitignore`'s `*.gen.ts` doesn't hide `src/deep/c.gen.ts`.
- **The project tree over-applies anchored rules.** `/anchored.ts` in
  `src/deep/.gitignore` also hides `src/deep/sub/anchored.ts`, and
  `/root-only.txt` in the root `.gitignore` also hides
  `src/root-only.txt`.
- Both walkers enter `.chain/native/target`-style build folders that a
  nested `.gitignore` excludes with an anchored rule (`/target/`).

Fixing these is a "Different by design" change like ticket 002's.

## Acceptance checklist and evidence

- [x] `path` helper equal to Node's POSIX `path` for 41 checks
- [x] Electron's asset reader and search tests pass on the copy (9)
- [x] Importer fixture from Electron (`../scripts/importer-recorder/`):
      index, a file instead of a folder, a missing folder, text, binary,
      large, folder and missing file reads, template export with and without
      a selection, and the full scan. The copy matches all 11, also through
      the snapshot wrapper.
- [x] Snapshot tests (`tests/platform/projects.test.ts`): same result as
      unwrapped, one listing instead of 30+, fallback when unlistable
- [x] `CI=true npm test` passes (228 tests); typecheck passes
- [x] Real app (before snapshots): this repository's tree, 367 nodes in
      219 ms, detected as Vite, `node_modules` excluded; search found the
      same 15 files and 45 matches as Electron; text and asset reads; a
      missing file gives Node's message
- [ ] Real app timing with snapshots (waits on `chain dev` restarting; see
      the verification log)
- [ ] The pickers with a real user choice (needs a person at the dialog)

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Verification log

- 2026-10-09, macOS arm64. Importer recorder wrote 11 snapshots from
  Electron at `c9abefc`; the copy matched them, directly and through
  `withFolderSnapshot`.
- 2026-10-09, macOS arm64, `chain dev`. `importProjectIndexFromDirectory`
  on lazify-chain: 367 nodes, 219 ms, `react-vite`. `searchProject` for
  `projectReader` in `src/**`: 15 files, 45 matches, the same as Electron
  in Node (48 ms), but 2.5 s through Chain: 718 `list`, 192 `stat`, 92
  `readText` calls. This led to the folder snapshot above.
- 2026-10-09: while investigating, I deleted `.chain/native/target`
  thinking it held only my own `cargo check` output. It also held
  `chain dev`'s `chain-inspector.json`, so `chain inspect` lost the running
  app until `chain dev` restarts. Cargo checks now use a separate
  `--target-dir`.
