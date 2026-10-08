# Capability Request 06 — Folders the app owns, with real paths its processes can use

Source: the Lazify rewrite to Chain, Phase 2 ticket 007 (Git, agent change
review). Rows: AI agents, Project creation, Imported templates, Code quality
and extensions.

**Not part of this request:**
- Lazify's settings and small JSON stores (`custom-agents.json`,
  `agent-autopilot.json`, API Studio stores and so on). Those move into
  `desktop.storage` (`docs/rewrite/03-data-inventory.md` §4).
- Reading the old Electron profile during import. That's request 01's
  read-only declared folders, or a later data-import request.
- Files the user picks or saves; `desktop.files` and `desktop.folders`
  already cover those.

## Why this needs a new capability

`desktop.files` keeps app files behind opaque references, on purpose, and
hands a real path to a process only as one `{ fileReference }` argument.
That doesn't reach these cases. Each is a *folder*, and the path ends up
inside another program's arguments, working directory or configuration:
`git --git-dir <folder>`, `npm install` run in a staging folder, a path
typed into an agent's terminal. `desktop.folders` gives real paths, but only
for folders the user picked or the app declared read-only. Neither gives
Lazify a place of its own to write.

## What Lazify actually does with this today (Electron, verified in source)

Persistent, under `app.getPath("userData")`:
- **Shadow Git repositories** (`src/main/agents/agent-changes.ts`). For a
  project that isn't a Git repository, Lazify keeps a private repo outside
  it and runs `git --git-dir <userData>/shadow-repos/<pid>/<name>-<hash>
  --work-tree <project> …`, so the agent changes panel can still show what
  an agent changed. It writes `<git-dir>/info/exclude` before the first
  `git add`.
- **Installed extensions** (`src/main/extensions/paths.ts`): downloaded
  language servers and linters, run as processes from that folder.
- **Imported templates** and the **starter catalog cache**
  (`scaffolding/imported-template-store.ts`, `scaffolding/catalog.ts`):
  folder trees copied into new projects.

Temporary, under `os.tmpdir()` / `app.getPath("temp")`:
- **Project staging** (`scaffolding/workflow/prepare.ts`): `mkdtemp`, then
  the template is written there and `npm install` runs in it before the
  result moves to the destination.
- **Pasted images** (`agents/clipboard-image.ts`): a pasted screenshot is
  saved as a PNG and its path typed into the agent CLI, which reads it.
- **Agent session files** (`agents/session-lint.ts`) and the API docs HTML
  that's rendered to PDF (`api-studio/docs/`).

Shadow repos are per running instance (`<pid>`), and folders left by
instances that are no longer running are deleted at startup
(`agents/instance-dirs.ts`).

## What Lazify needs

- **A persistent app folder** that survives restarts and updates, and a
  **temporary folder** the OS may clear. Both are private to the app.
- **Real absolute paths** for both, so they can be passed as process
  arguments, as `cwd` for `process-runner` and `terminal`, and inside
  arguments like `--git-dir=<path>`.
- **Read and write through `desktop.folders`** (list, read, write text and
  bytes, create folder, move, delete) without a picker, as if they were
  read-write grants.
- **Kept out of the user's projects**: never inside a granted folder unless
  the user picked it.
- Telling instances apart (the `<pid>` above) is Lazify's to solve with its
  own ids. If Chain has a notion of "this app run", saying so would help
  clean-up.

## Platforms

macOS first (D-2): presumably `~/Library/Application Support/<identifier>`
and the user's temporary folder. Windows later, with the same contract.

## Suggested next step for chain-sdk

The contract shape is Chain's decision: a folder grant that always exists,
two well-known paths, or something else. When it ships, Lazify moves the
shadow repos onto it first (ticket 007) and verifies the agent changes
panel on a project that isn't a Git repository.
