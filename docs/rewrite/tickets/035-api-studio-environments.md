# 035 — API Studio: environments and secrets (Phase 6 / Done)

**Read this whole ticket before touching code.** Second of the eight
API Studio slices in `05-work-queue.md`. Lets a scanned project's
derived variables (`baseUrl`, each auth scheme, each required header —
ticket 034's `deriveEnvironmentVariables`) get real values across named
environments (Local, Staging, …), with secrets kept out of the project
folder. `readApiEnvironments` and `saveApiEnvironments` of the 23
`api-studio` members. Everything else (request execution, scripts,
collections, response files/exports, docs) is a later ticket.

## Goal

Open a scanned project, see one "Local" environment to fill in, add a
value for `baseUrl` and a bearer token, mark the token a secret, save,
reopen the project (or switch to Staging) and get the right values
back — with the token never written anywhere inside the project
itself.

## Status — 2026-10-15

Done, verified live. `readApiEnvironments` and `saveApiEnvironments`
are real on `src/platform/lazify.ts`; the other 18 `api-studio`
members still reject as unported. D-7 (`04-architecture-decisions.md`)
was decided the same day, specifically to unblock this ticket:
plaintext JSON, matching Electron exactly — chain-sdk has no keychain
capability, and building one wasn't worth stalling this slice for.

`CI=true npm test`: 759 of 768 pass, 9 skipped (whole repo, up from
744 before this ticket — 15 new cases: 7 for `environment-store.ts`,
8 for `environment.ts`, the latter missed by ticket 034 even though
`environment.ts` itself rode in with ticket 015). `npm run typecheck`
and `npm run build:web` pass.

Then verified live in `chain dev` through `chain inspect` (same
technique as ticket 034: a scratch project under `appFolder("data")`,
no native picker needed):

- A fresh project's `readApiEnvironments` answered one "Local"
  environment, empty, as designed.
- `saveApiEnvironments` with a `baseUrl` and a bearer token across
  Local and Staging, `authorization` marked secret: read back with
  both values merged in per environment.
- **On disk**, the project's own `.lazify/api-studio/environments.json`
  held `baseUrl` for both environments and no trace of either token.
  The app's own `api-studio-environments.json` (beside the app's data,
  not inside it — `appFolder("data")`) held both tokens, keyed by the
  project's resolved path and then by environment id.
- That secrets file was `-rw-------` (0600) — the `chmod` this ticket
  added over `process-runner` (see below) actually ran, for real, not
  just under the test's real-`chmod` mock.

## Source-of-truth references

- Roadmap row: Phase 6, second row of the API Studio breakdown in
  `../05-work-queue.md`
- Old source (unchanged): `src/main/api-studio/environment-store.ts`
  (186 lines, the only file this ticket ports — `environment.ts`
  itself was already in this repo, see below)
- Old tests: `tests/main/api-studio/{environment-store,environment}.test.ts`
  (194 + 222 lines) — both ported this pass; `environment.test.ts`
  should have landed with ticket 034 (it only exercises already-ported
  `environment.ts`, `scan-project-routes.ts` and `runner/build-request.ts`)
  but was missed until this one
- Public API (group in `02-contract-manifest.md`): `readApiEnvironments`,
  `saveApiEnvironments` only, of the 23-member `api-studio` group
- Persistent data touched: `<project>/.lazify/api-studio/environments.json`
  (names, order, non-secret values — travels with the project) and
  `<appFolder("data")>/api-studio-environments.json` (secret values
  only, keyed by resolved project path then environment id — stays on
  this machine)
- Required OS behaviour: `chmod 600` on the secrets file, POSIX only
  (see below)

## What changed in the copy, and why

`environment.ts` needed no action — already ported byte-identical by
ticket 015, confirmed again this pass. `environment-store.ts` reads
and writes real files, so it gets the same treatment ticket 034's
`route-cache.ts` did:

- `node:fs`'s sync calls become `@/platform/folders`'s async
  `readTextFile`/`writeTextFile`/`createFolder`, so `readEnvironments`
  and `saveEnvironments` are async now (Electron's were sync). The
  bridge in `lazify-api.ts` already declared both as returning a
  `Promise`, so nothing downstream needed to change.
- `app.getPath("userData")` becomes `appDataPath()`
  (`desktop.folders.appFolder("data")`, shipped for request 06,
  already used by `diagnostics/logger.ts`).
- **The owner-only file mode (`0o600`) Electron set on the secrets
  file has no equivalent in `desktop.folders`** — confirmed against
  chain-sdk's own `folders` capability contract, which documents no
  `mode` option on `writeText`/`writeBytes`. Rather than drop the
  restriction, `restrictToOwner()` shells `chmod 600` through
  `@/platform/exec`'s `execFile` on every non-Windows save — the same
  "the OS tool does what the capability doesn't" pattern ticket 033
  used for `ditto`/`hdiutil`. Skipped on Windows, where POSIX mode
  bits aren't the applicable protection anyway (the ported test's own
  `process.platform === "win32"` guard already assumed this).

## Target boundary

- `src/shared/lib/api-studio/environment-store.ts` (new): the two
  functions above, calling `@/platform/folders` and
  `@/platform/exec` directly (not pure — this is the one file in this
  slice that touches disk, same shape as `route-cache.ts`).
- `src/platform/api-studio.ts`: `readApiEnvironments`/
  `saveApiEnvironments` added, thin wrappers like the three ticket 034
  already added.
- `src/platform/lazify.ts`: the two members move off
  `rejects(unported.apiStudio)`. 18 members still reject.

## Confirmed real API reference

No new chain-sdk capability. Everything needed
(`readTextFile`/`writeTextFile`/`createFolder`/`appDataPath` from
`folders`; `execFile`/`currentOs` from `exec`) already shipped for
earlier tickets.

## Execution steps (small commits)

1. `environment-store.ts`, ported onto `@/platform/folders` plus the
   `chmod` addition.
2. `src/platform/api-studio.ts` and `lazify.ts` wiring, fixing the one
   existing test (`tests/platform/lazify.test.ts`) that asserted one
   of these two members was still unported — same pattern as ticket
   034's step 5.
3. `environment.test.ts` and `environment-store.test.ts` ported, the
   latter needing a real (not faked) `chmod` in its test double so the
   mode-bit assertion still means something — see Open questions.
4. Verified live.

## Acceptance checklist and evidence

- [x] `environment-store.test.ts` and `environment.test.ts` port and
      pass unchanged (15 cases)
- [x] A fresh project reading its environment in the real app gets one
      empty "Local" environment
- [x] Saving values across two environments, one marked secret, and
      reading them back in the real app: both environments' values
      correct, secret included
- [x] On disk in the real app: the project's own preset file has no
      secret value; the app's own secrets file has both, keyed by
      project path and environment id; the secrets file is `0600`
- [x] `CI=true npm test` (759 of 768, whole repo), `npm run typecheck`,
      `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. The other 18
`api-studio` members keep rejecting as unported until their own
tickets.

## Rollback

Revert the commits; the two members go back to
`rejects(unported.apiStudio)`.

## Open questions

- `environment-store.test.ts`'s mode-bit assertion needed a real
  `chmod` behind `@/platform/exec`'s mock (via `node:child_process`),
  not a faked one — a faked `execFile` that just resolves would make
  the assertion pass for the wrong reason (it never actually checks
  anything was restricted). Worth remembering if a future ticket's
  test is tempted to fake `execFile` wholesale: check whether the
  behaviour under test is the shelled-out side effect itself.
- `restrictToOwner()` swallows a failed `chmod` silently
  (`.catch(() => undefined)`), matching the general shape of
  "a secret write that cannot set its own permissions still writes"
  rather than failing the whole save over a missing `chmod` binary or
  an unexpected OS. Not yet seen failing live — only reasoned about.
- Same as ticket 034: not yet clicked through the actual Environment
  Picker/Environment Modal screens, which need a project opened
  through the native folder picker. Left for a person.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 15 characterisation cases pass
  (`environment-store.test.ts` 7, `environment.test.ts` 8).
  Whole-repo `CI=true npm test`: 759 of 768 pass, 9 skipped.
  `npm run typecheck` and `npm run build:web`: clean.
- 2026-10-15, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`): a scratch project's `readApiEnvironments` answered one
  empty "Local" environment; `saveApiEnvironments` across Local and
  Staging with `authorization` marked secret read back correctly;
  the project's own preset file on disk held only `baseUrl`, the
  app's own secrets file held both tokens keyed by project path and
  environment id, and that file was confirmed `-rw-------` (0600) by
  `stat`. Scratch project, secrets file and the `chain dev` process
  cleaned up afterward. Not yet done: the actual screens clicked
  through (needs the native folder picker).
