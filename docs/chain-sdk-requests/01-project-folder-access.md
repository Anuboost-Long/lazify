# Capability Request 01 — Work inside folders the user chose

Source: the Lazify rewrite to Chain (`docs/rewrite/01-capability-inventory.md`).
The rows are Projects and workspace, Environment files, Project creation and
Imported templates. This is the first step of the roadmap's Phase 4 slice
("open a project"). Nothing else in Lazify works without it.

**Not part of this request:**
- Watching for changes (request 02).
- Running processes in those folders (request 03).
- Reading Lazify's old Electron profile, and reading other tools' data folders
  such as `~/.claude/projects`. Lazify needs those too, but they come later.
  Mneme's request 11 (`external-file-read`) covers the second one; see "Design
  fork" below.

## Why this needs a new capability

`desktop.files` cannot do this, by design. Its CONTRACT.md non-goals say:

> **Never accepts or returns a real filesystem path.** Only an opaque
> reference string the capability itself generated […]
> No directory listing / enumeration API […]

Lazify is a developer workbench. Its whole subject is the user's own project
folders: real paths, which it shows in the UI, passes to Git, package managers
and agent CLIs as argv, and opens in the user's editor. An opaque-reference
store cannot hold a repository. This is a different capability, not a missing
method on `files`. Please do **not** weaken `files`' no-real-paths rule to
fit it.

## What Lazify actually does with this today (Electron, verified in source)

| Use | Current code | Operations |
| --- | --- | --- |
| Choose project folders | `src/main/ipc/projects.ts` (`lazify:select-directory`, `select-directories`, `select-paths`) | Native folder picker: single, multiple, or files plus folders |
| Index a project tree | `src/main/projects/project-importer-optimized.ts` | Recursive `readdir` with file types, `stat`, reading `.gitignore` at every level, skipping `node_modules`-style directories (`IGNORED_DIRECTORY_NAMES`) |
| Preview a file | same file, `readImportedProjectFile` | `stat`, then read a text preview |
| Preview an image or PDF | `src/main/projects/project-asset-reader.ts` | Read bytes, capped at 16 MB |
| Edit `.env*` files | `src/main/projects/env/` | Read text, then write text back, keeping comments and line order |
| Project-local Lazify data | `src/main/projects/lazify-directory.ts`, `src/main/api-studio/*` | `mkdir -p .lazify/…`, read and write JSON, append to `.gitignore` |
| Create a project from a template | `src/main/scaffolding/*` | Create a directory tree, write many files, copy a source tree |
| Dropped files | `src/preload/api/system.ts` (`webUtils.getPathForFile`) | The real path of a file dropped onto the window |

Two facts about today's code matter for the design:
- **The renderer passes absolute paths, and the main process checks nothing.**
  `readImportedProjectFile` and `readProjectAssetFile` resolve any path they
  are given. The new capability should be stricter (see below). Lazify will
  record that as an intended difference.
- **Lazify owns all the meaning.** It parses `.gitignore`, chooses what to
  skip, and handles `.env` syntax, template rules and JSON shapes. None of
  that belongs in Chain.

## What Lazify needs

The contract shape is Chain's decision (rule 2). At minimum:

- **Granting a folder.** A native picker for one or more folders, and
  optionally files. Choosing a folder grants Lazify access to everything under
  it. Grants must **survive restarts**: Lazify reopens the same projects every
  launch without asking again. The app also needs a way to list and revoke
  grants. Dropping a folder onto the window should be able to grant it too.
- **Real paths in and out.** Absolute, normalised paths are returned and
  accepted. Every call is checked natively: the path is canonicalised,
  rejected unless it is inside a granted root, and the symlink policy is
  explicit (Lazify's suggestion: follow symlinks only when the target is also
  inside a granted root).
- **Listing.** Directory entries with name, kind (file, directory or
  symlink), size and modified time. A large monorepo (tens of thousands of
  entries) must index in about the time Node takes today. Two shapes would
  work:
  - per-directory listing that is fast enough to call thousands of times, or
  - a recursive listing that takes a set of directory names to skip.

  `.gitignore` handling stays in Lazify either way.
- **Read:**
  - text (UTF-8),
  - bytes with a size cap (for image and PDF previews),
  - `stat` and `exists`.
- **Write:**
  - text, written atomically (temp file plus rename, so a crash never leaves
    a half-written `.env` or `requests.json`),
  - bytes,
  - create a directory (recursively),
  - rename or move inside granted roots,
  - delete (a file, or a directory recursively).

  Lazify will confirm destructive actions in its own UI. Whether delete
  should go to the Trash is a fair question for Chain.
- **Errors** normalised to `ChainErrorCode`: not found, permission denied,
  outside granted roots, not a file or directory, file locked, path too long.

## Design fork for chain-sdk to decide

Lazify also needs **read-only** access to a few fixed folders the user never
picks, such as `~/.claude/projects` and `~/.codex/sessions` for agent usage,
and the old Electron profile during data import. Mneme's request 11 asked for
the same thing. One design would serve both: grants come from either the
picker or an app-declared read-only allow-list (in config, visible to the
user). Two separate capabilities would also work. Lazify only needs
the decision to be made with both requests in view.

## Native module survey — macOS vs Windows

### macOS
- Lazify ships unsandboxed. It is ad-hoc signed today (`electron-builder.mac.yml`,
  `identity: null`) and not distributed through the Mac App Store. So a
  picker grant is an **app-level** policy Chain enforces, not an OS
  security-scoped bookmark. If Chain ever supports sandboxed builds,
  persistent grants would need security-scoped bookmarks. Worth keeping the
  grant API able to carry an opaque token for that reason.
- Folders under TCC protection (`~/Desktop`, `~/Documents`, `~/Downloads`,
  iCloud Drive) trigger an OS consent prompt on first access from the app.
  Chain should surface a denial as "permission denied", not as "not found".
- APFS is usually case-insensitive. Path comparison for the "inside a granted
  root" check must handle that, as well as `/private/var` vs `/var`-style
  symlinks.

### Windows (not verified, no Windows machine used)
- `MAX_PATH` (260): deep `node_modules` trees exceed it routinely. Use the
  `\\?\` form natively, as `process-runner` already does for file arguments.
- Files held open by editors, antivirus or dev servers make write, rename
  and delete fail with sharing violations. Atomic replace needs `ReplaceFileW`
  or a retry, not a plain rename.
- Case-insensitive paths, `\` vs `/`, and drive-letter case all affect the
  granted-root check.
- Lazify ships a Windows build today, so this capability is on the critical
  path for Windows parity.

### Shared
Rust `std::fs`, plus a canonicalisation helper, covers both platforms with no
Swift or .NET code. Only the picker is per-OS, and Chain already has one in
`files.pick`.

## Suggested next step for chain-sdk

Per rule 1, draft `capabilities/<name>/CONTRACT.md` and `contract.ts`. Name it
for what it means to an app developer: something like "workspace folders" or
"user folders", not "fs". Settle the design fork above first, and make the
non-goals explicit: no watching (request 02), no process execution, and no
access outside granted roots.
