# 005 — Scripts (Phase 2 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: the
`scripts` group runs real projects' scripts in Chain terminal sessions, picks
the package manager as Electron did, and moves a dev server off a busy port.

## Goal

Rebuild the Electron app's `scripts` preload group on Chain, on top of
ticket 004's terminal sessions: list a project's scripts (including
synthesised `dotnet:*` ones), run, stop and restart them, and list running
sessions with the ports they hold.

## Status — 2026-10-09

- `src/platform/scripts.ts`: `listScripts`, `runScript`, `stopScript`,
  `restartScript`, `listSessions`, `onSessionKilled`, and the session
  functions re-exported from `terminal.ts` (`ptyWrite`, `ptyBacklog`,
  `ptyResize`, `onPtyData`, `onScriptStatus`), matching
  `src/preload/api/scripts.ts`.
- Ported to `src/shared/lib/environment/`: `dev-port.ts`,
  `dotnet-runner.ts`, `scanner.ts`, `ports.ts`.
- New platform files: `exec.ts` (Node-style `execFile` and `currentOs` over
  `process-runner` and `platform`) and `ports.ts` (`isPortFree` over
  `desktop.ports`, shipped for
  [request 05](../../chain-sdk-requests/05-local-port-availability.md)).
- Golden fixture recorded from Electron for the dev-port table, the .NET
  runner on real folders, and `lsof`/`ps` parsing. Headless tests for the
  whole group. Verified in the running app.

## Source-of-truth references

- Roadmap row: Scripts and terminal.
- Electron source (unchanged): `src/main/ipc/scripts.ts`,
  `src/preload/api/scripts.ts`, `src/main/environment/dev-port.ts`,
  `dotnet-runner.ts`, `scanner.ts`, `ports.ts`.
- Electron tests: none for these modules; a characterisation fixture was
  added.

## What changed in the copy, and why

- File reads (`package.json`, `launchSettings.json`, lock files) go through
  ticket 002's `ProjectReader`; functions take a `project` instead of a
  path.
- `execFile` comes from `src/platform/exec.ts`. `windowsHide` is dropped:
  `process-runner` never opens a console window.
- `process.platform` becomes `currentOs()` from `desktop.platform`. Chain
  targets only macOS and Windows, so `ports.ts`'s Linux `ss` fallback and
  its parser are removed as unreachable.
- `scanner.ts`: `normalizeRuntimePath()` is dropped, because Chain already
  gives spawned processes the login-shell `PATH`. `nodeVersion` is now the
  user's `node --version`; Electron reported `process.version`, the Node
  built into Electron, so the "Node.js 18+ is required" check never looked
  at the user's Node.
- `scripts.ts`: there is no non-PTY fallback (Chain always has terminals),
  so `ptyAvailable` is always `true`.

## Different by design

- **Port check.** Electron bound `0.0.0.0` only, so a server on `[::1]` or
  `127.0.0.1` read as free; Vite listens on `[::1]` by default on macOS.
  `desktop.ports.isFree` binds `0.0.0.0`, `127.0.0.1`, `::` and `::1` and
  reports free only if all four succeed. A second Vite dev server now gets
  `--port 5174` from Lazify instead of relying on Vite's own fallback.

## Not ported yet, and where it goes

- `waiting` and `isAgent` on sessions are always `false`, and hidden agent
  runs aren't filtered: agents, ticket 008.
- Clearing an agent's "waiting" badge when Enter is typed: ticket 008.
- `writeProjectExtensionManifest` before a run: the extensions slice.
- Diagnostic logging of the argv: the diagnostics slice.
- Electron's `PackageManager` here is only npm or Yarn, so a pnpm or Bun
  project runs its scripts with npm. Carried over; stack detection already
  knows the right manager, so this is a candidate improvement.

## Acceptance checklist and evidence

- [x] Golden fixture from the Electron code
      (`../scripts/environment-recorder/`): `resolveBasePort` for 21
      commands; `listDotnetScripts`, `resolveDotnetLaunch` and
      `resolveDotnetPorts` on 6 real folders (a BOM in
      `launchSettings.json`, unreadable settings, no project); `lsof` and
      `ps` parsing. The copy matches all 10 snapshots.
- [x] Headless tests (`tests/platform/scripts.test.ts`): listing, package
      manager choice and fallbacks, no package manager, .NET, dev-port
      stepping for npm (`--`) and Yarn, stop with the "session killed"
      event, restart, sessions with ports from the process tree
- [x] `CI=true npm test` passes (113 tests); typecheck and `cargo check`
      pass
- [x] Real app: two Vite dev servers side by side, the second launched as
      `npm run dev -- --port 5174`; sessions listed with ports 5173 and
      5174; both stopped with nothing left listening
- [ ] Windows: Chain's `ports` and `terminal` are unverified there (D-2)

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Verification log

- 2026-10-09, macOS arm64. Recorder wrote 10 snapshots from Electron at
  `c9abefc`; the copy matched them with `CI=true`.
- 2026-10-09, macOS arm64, `chain dev` after `chain update` for request 05.
  `desktop.ports.isFree(1420)` was `false` for the app's own Vite on
  `[::1]:1420`. In a throwaway project inside this repo (deleted after),
  `runScript(…, "dev")` twice: argv `npm run dev` then
  `npm run dev -- --port 5174`; Vite printed 5173 and 5174;
  `listSessions` reported ports `[5173]` and `[5174]`; `stopScript` on both
  left no listener on either port.
