# 030 — Linting (Phase 5 / Done)

**Read this whole ticket before touching code.** SonarQube for IDE and
Tailwind CSS findings on Chain: the editor's underlines, the project scan
with its fix phases, fix tasks, and the bridge that hands findings to an
agent after every write. The six `linting` members and `onSonarScan`.
Installing the engines is ticket 029.

## Goal

The file in the editor is underlined as it is typed. A project scan runs
in batches of 1,000 files with progress, can be stopped, is kept in
`.lazify/sonar-scan.json`, and turns into fix tasks split into phases. An
agent Lazify opens gets the same findings for the files it writes:
Claude through a `PostToolUse` hook, other CLIs through a script they are
told about.

## Status — 2026-10-14

Done on macOS. No Chain request was needed: `process-runner` bytes output
and stdin (request 16) carry the language servers, `agent-server` carries
the bridge, `desktop.packages` (request 17) holds the engines.

The golden fixture recorded from Electron matches in both cases, and
Electron's six linting tests pass on the copy. In the app: both real
engines answered `lintFile` (SonarLint S1854 from a cold start in 10.2 s;
Tailwind `cssConflict` in 0.6 s), the agent's client script got a real
finding through `agent-server` as a hook and as a command, a reload
stopped both servers, and an agent started before the reload still got
findings afterwards. Left: a project scan and its phase tasks in the app,
the editor's underlines clicked through, and a real Claude session given
findings after a write.

## Source-of-truth references

- Roadmap row: Phase 5 "code quality" (split from 029)
- Old source: `src/main/linting/*` (1,860 lines), `src/main/ipc/linting.ts`,
  `src/main/agents/session-lint.ts` and its call in `src/main/ipc/agents.ts`
- Public API: `lintFile`, `createFixTask`, `startSonarScan`,
  `stopSonarScan`, `sonarScanState`, `createPhaseTasks`, `onSonarScan` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: `tests/main/linting/*` (6 files, 670 lines); a golden fixture
  is added for the report texts, fix tasks, phase plans, scan file sets
  and scan runs
- Persistent data touched: `<project>/.lazify/sonar-scan.json` (and
  `.lazify/` in `.gitignore` inside a repository); tasks in Chain storage;
  per-session client and Claude settings under the app's temp folder
- Required OS behaviour: `java` 21+ for SonarLint, `node` for Tailwind's
  server and for the agent's client script; `git` for the scan's file list

## Current observable behaviour

- **Editor:** `lintFile(path, buffer)` runs every engine on the buffer;
  an engine that throws or times out adds nothing. One language server
  per engine per project root, started on first use (SonarLint 90 s for
  a first answer, then 20 s; Tailwind 20 s, then 6 s), shut down after
  5 minutes idle, dropped when its extension changes.
- **Scan:** joins a run already going; three files at a time; a progress
  event per file without the report; `no-engines` / `no-files` failures;
  stop keeps what was found; a batch with findings keeps its place, a
  clean one hands on to the next 1,000.
- **Agent bridge:** a socket per app run; the client exits 0 and says
  nothing on any failure; Claude gets `--settings` with the hook and
  `--append-system-prompt`; every agent gets `LAZIFY_LINT`,
  `LAZIFY_LINT_PROJECT` and `LAZIFY_LINT_GUIDE`; the engines are warmed
  on a project's first agent.

## Target boundary

- Copied to `src/shared/lib/linting/` beside the type stand-ins already
  there. File reads and writes through `src/platform/folders.ts`, the
  `git ls-files` list through `execFile`, tasks through the task store.
- `src/platform/language-servers.ts` starts a server through
  `processRunner.run(…, { output: "bytes", keepStdinOpen: true })`; the
  JSON-RPC framing counts bytes as Electron's did.
- `src/platform/lint-bridge.ts` runs the bridge on `desktop.agentServer`
  (HTTP on 127.0.0.1) instead of a Unix socket.
- `src/shared/lib/agents/session-lint.ts` prepares a session; the agent
  launch in `src/platform/agents.ts` adds its args and env.

## Differences from Electron

- **The bridge is HTTP on 127.0.0.1 with a per-run token**, not a socket
  file only the user can open: `agent-server` binds loopback, and any
  local process could reach it, so a request without the token gets 403.
- **The client asks, then polls.** `agent-server` answers each request
  within 30 s and serves one at a time, while SonarLint's first answer can
  take 90 s. So the client posts the paths, gets a job id at once, and
  asks for the report every 250 ms (up to Electron's 120 s), and no agent
  holds the server while another waits.
- **A UI reload keeps the bridge's port and token** (kept in
  `sessionStorage`), so an agent that survived the reload still reaches it.
- **Language servers are stopped before a reload** (`pagehide`); Electron's
  lived in the main process, which a reload did not touch. Chain's stop
  them at quit.
- **The engines are stopped before a package is removed or reinstalled**,
  as `desktop.packages` asks (both, since they restart on the next lint).
- **One client script and one Claude settings file** in the app's temp
  folder, rewritten at each launch, instead of a folder per session that
  was pruned at startup: their contents never differ between sessions.
- **`initialize` sends `processId: null`**: the window has no process id
  to give. Chain stops the servers at quit, which is what the id was for.
- **`collectScanFiles` asks git for deleted files** instead of checking
  each listed path on disk, and the scan, `lintPaths` and the store are
  async.

## Execution steps

1. Record the golden fixture from Electron; port the pure parts (report,
   relative paths, fix task, phase plan, report text).
2. Language servers and `lintFile` / `lintPaths`, with a fake server
   speaking LSP over stdio in the tests.
3. The scan: file set, store, runner, phase tasks; wire the six members.
4. The bridge and the agent session; check it in the app with Claude.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from Electron (`../scripts/linting-recorder/`,
      2 snapshots, the language servers faked the same on both sides): the
      agent report, fix tasks (one, labelled across files, past the notes
      limit), phase plans for 1–9 phases, phase options, snippets, the
      scan report text; the scan file set of a repository (ignored, test,
      output, installed and deleted files left out) and of a plain folder;
      `lintPaths` (duplicates, unreadable, non-source and past 20 dropped);
      two scan runs (findings keep the cursor), the stored report and
      `.gitignore`, `no-engines`, stop, and the warm-up's one file. The
      copy matches both
- [x] Electron's six linting tests pass against the copy (42 tests), plus
      one for a tracked file deleted from the working tree
- [x] A real child process speaking LSP answers through the byte framing,
      with multi-byte messages and a path holding a space, `#` and `é`
      (`tests/shared/lib/linting/language-server.test.ts`)
- [x] The client script against the bridge handler on a real HTTP port:
      a report, a hook payload waited out past one request, a clean file,
      a wrong token, no app (`tests/platform/lint-bridge.test.ts`)
- [x] In the app: a buffer linted by both real engines in a real project
- [ ] In the app: a project scan with progress, stop, and phase tasks
- [ ] In the app: the editor's underlines and the findings panel clicked through
- [x] In the app: the agent client given a finding through `agent-server`;
      the bridge kept its port and token across a reload
- [ ] In the app: a real Claude session given findings after a write
- [x] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commits; the members go back to their stubs and agents launch
without the bridge.

## Open questions

- A UI reload cannot reach a language server started before it (Chain
  has no handle after a reload), so they are stopped on `pagehide`. That
  stop reached native in the one reload tried; if it ever does not, the
  servers run until quit.

## Keeping the two copies in step

```sh
npx vitest run --root docs/rewrite/scripts/linting-recorder
```

Move the snapshot over
`tests/shared/lib/linting/__snapshots__/linting.golden.test.ts.snap`,
then check with `CI=true npm test`.

## Verification log

- 2026-10-14, macOS 27.0.1 arm64: fixture recorded from Electron at
  `c9abefc`, copy matches. In the app on `chain dev`: `lintFile` on a
  probe buffer for `lazify/src/renderer/features/init/components/SourceModeCard.tsx`
  gave `typescript:S1854` (10,164 ms, cold) and two Tailwind
  `cssConflict` (587 ms). `prepareSessionLint("claude", …)` gave the
  settings, the guide and the env; the client printed S9383 for
  `ProjectCodeActions.tsx` as a hook and as a command; a wrong token
  printed nothing, a bare POST got 403. `location.reload()` stopped the
  Java and Node servers (and SonarLint's own Node child); afterwards
  `ensureLintBridge()` answered the same port and token, and the old
  client got its finding in 8.4 s.
