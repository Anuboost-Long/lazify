# 034 — API Studio: route inventory and scanners (Phase 6 / Done)

**Read this whole ticket before touching code.** First of the eight
API Studio slices in `05-work-queue.md`: scan a project for its API
routes (OpenAPI descriptions first, then Express, NestJS, Flask,
FastAPI, ASP.NET and Laravel source heuristics), cache the result under
`.lazify/api-studio/`, and read it back. `scanProjectRoutes`,
`readProjectRoutes`, `readRouteDetails` of the 23 `api-studio` members.
Everything else in the group (environments, requests, scripts,
collections, docs — D-7 included) is a later ticket; this one does not
touch them.

## Goal

A project with routes open in API Studio and see them: method, path,
summary, tags, source (an OpenAPI doc beats reading source), and a
confidence/unresolved-route warning where the scan couldn't be sure.
Rescanning a project whose routes haven't moved keeps each route's
`firstSeenAt` and any saved request data keyed to its id (roadmap
acceptance: "Stored request data survives a rescan when route identity
is unchanged").

## Status — 2026-10-15

Done in tests, five commits. `scanProjectRoutes`, `readProjectRoutes`
and `readRouteDetails` are real on `src/platform/lazify.ts`; the other
20 `api-studio` members still reject as unported. All 744 tests in the
repo pass (`CI=true npm test`), including 95 characterisation cases
ported unchanged from Electron's `openapi-scan`, `framework-rules`,
`monorepo-scan`, `aspnet-scan`, `php-python-frameworks` and
`route-cache` suites, against a Node-backed fake of `desktop.folders`
(`tests/platform/node-folders.ts`, the same harness ticket 028's
go-to-definition tests use). `npm run typecheck` passes. **Not yet
exercised in the real app** — see the acceptance checklist.

Two directories this ticket needs were missing from the original
scope estimate below and only turned up once `framework-scanner.ts`
and `model-index.ts` were actually read: `engine/` (the route-matching
core — `annotation-routes.ts`, `call-routes.ts`, `call-groups.ts`,
`path-template.ts`, `parameter-binding.ts`, `route-drafts.ts`, 1,051
lines) and `body-template/` (building an example request body from a
model or an OpenAPI schema, 370 lines plus a 9-line barrel). Both are
pure and ported unchanged. `environment.ts` (`deriveEnvironmentVariables`
and its siblings — pure, no storage, unlike `environment-store.ts`)
needed no action at all: ticket 015 had already ported it
byte-identical. Actual new code: ~5,700 lines, not the ~4,300
estimated.

Three real boundary differences from Electron, decided during
implementation rather than requested from chain-sdk:

- **`buildRouteId`'s hash.** The webview has no `node:crypto`, and
  `SubtleCrypto.digest` is async-only where Electron's call sites are
  synchronous. Swapped the truncated SHA-1 for a synchronous
  non-cryptographic 64-bit digest (two 32-bit FNV-1a lanes) — this id
  only needs to be short, deterministic and distinct per
  project+route+source, never secret. `route-identity.test.ts` checks
  stability and distinctness, not a literal hash value, so it ported
  unchanged.
- **Gzip via `CompressionStream`/`DecompressionStream("gzip")`**,
  not `node:zlib`. Verified working under Node (the test run above
  round-trips real gzip bytes); still needs a live `chain dev` check
  since the target runtime is WebKit, not Node (see Open questions).
- **The atomic write is temp-file-then-delete-then-move, not a bare
  rename.** Checked against chain-sdk's `folders` capability contract
  (`agent-docs/capabilities/folders/CONTRACT.md` in the chain-sdk
  repo): `move()` rejects with `INVALID_ARGUMENT` if the destination
  already exists, same as Electron's `fs.rename` would on most
  platforms if it didn't silently replace — so overwriting
  `routes.json` on a rescan needs the old copy deleted first. This
  narrows the atomicity window (delete-then-move) rather than
  removing it (a bare direct write would).

## Source-of-truth references

- Roadmap row: Phase 6, "API Studio: route inventory/scanners" (first
  row of the breakdown in `../05-work-queue.md`)
- Old source (unchanged), `src/main/api-studio/`:
  - `scanners/` (1,499 lines): `framework-scanner.ts`, `model-index.ts`,
    `project-security.ts`, `project-servers.ts`, `index.ts`, and
    `scanners/openapi/` (`document-locator.ts`, `document-parser.ts`,
    `operation-fields.ts`, `operation-normalizer.ts`,
    `reference-resolver.ts`, `security.ts`, `source-locator.ts`,
    `values.ts`, `index.ts`)
  - `rules/` (1,097 lines): `types.ts`, `index.ts`, `express.ts`,
    `nestjs.ts`, `flask.ts`, `fastapi.ts`, `aspnet.ts`, `laravel.ts`
    (`environment-policy.ts` already ported, see Status)
  - `reading/` (427 lines): `declarations.ts`, `annotations.ts`,
    `return-types.ts` — C# model/return-type reading the `aspnet` rule
    needs
  - `yaml/` (534 lines): `parse-yaml.ts`, `scalars.ts`, `lines.ts`,
    `flow.ts`, `block-scalar.ts`, `index.ts` — the hand-rolled YAML
    reader the OpenAPI scanner needs for `.yaml`/`.yml` docs (JSON
    OpenAPI docs need none of this)
  - `engine/` (1,051 lines): `annotation-routes.ts`, `call-routes.ts`,
    `call-groups.ts`, `path-template.ts`, `parameter-binding.ts`,
    `route-drafts.ts` — missed in the original scope estimate, found
    once `framework-scanner.ts` was actually read (see Status)
  - `body-template/` (370 lines + a 9-line barrel): `placeholders.ts`,
    `serialization-policy.ts`, `property-names.ts`, `form-fields.ts`,
    `from-openapi-schema.ts`, `from-model-index.ts`, `index.ts` — also
    missed originally
  - `environment.ts` (212 lines) — already ported byte-identical by
    ticket 015; nothing to do here
  - `project-inventory.ts` (148), `workspaces.ts` (95),
    `route-identity.ts` (41), `route-index-format.ts` (147),
    `route-cache.ts` (193), `scan-project-routes.ts` (115)
  - Entry point: `src/main/api-studio/index.ts`; wired in
    `src/main/ipc/api-studio.ts`
- Public API (group in `02-contract-manifest.md`): `scanProjectRoutes`,
  `readProjectRoutes`, `readRouteDetails` only, of the 23-member
  `api-studio` group
- Old tests to mirror: `tests/main/api-studio/{openapi-scan,
  framework-rules, monorepo-scan, aspnet-scan, php-python-frameworks,
  route-identity, route-cache, yaml-reader, return-types}.test.ts`
- Persistent data touched: `<project>/.lazify/api-studio/routes.json`
  (the index) and `<project>/.lazify/api-studio/routes/*.json.gz` (one
  gzip file per route folder, read on demand by `readRouteDetails`);
  migrates away from the older `<project>/.lazify/api-studio-routes.json`
  Electron itself superseded (`SUPERSEDED_FILE` in `route-cache.ts`)
- Required OS behaviour: none beyond reading/writing inside the
  project folder, already granted (request 01)

## What changes in the copy, and why

`types.ts` and the rule/scanner logic itself (route matching, OpenAPI
normalization, confidence scoring) are pure and copy as is. Three
things read or write outside that boundary in Electron and need the
same adapter `project-inventory.ts` already did for file access
(ticket 002):

- **`project-inventory.ts` and `workspaces.ts`** currently call
  `node:fs` directly (`fs.readdir`, `fs.stat`, `fs.readFile`) to walk
  the project and reuse `detectProjectStack`/`readPackageJson`, both
  already ported onto `ProjectReader`. This ticket ports them the same
  way: take a `ProjectReader` (from `stack-detection/project-reader.ts`,
  not a new one) instead of a root path, exactly ticket 002's pattern.
  Everything downstream (`createProjectInventory`'s returned
  `hasDependency`/`manifestOf`/`readFile` closures, every scanner and
  rule) is unaware of the change.
- **`route-cache.ts`** is not pure — it is the one file in this slice
  that persists anything. It goes to `src/shared/lib/api-studio/`
  alongside the rest (everything here is project-scoped, like
  `custom-collections.ts` already there) but calls
  `src/platform/folders.ts` directly instead of taking an injected
  reader: `readTextFile`/`writeTextFile` for the JSON index,
  `readFileBytes`/`writeFileBytes` for the gzip detail files,
  `listFolder` for the stale-detail sweep, `pathExists`/`deletePath`
  for clearing the superseded file, and `movePath` for the
  write-temp-then-rename atomicity Electron's `writeAtomically` did
  with `fs.rename`.
- **Gzip without `node:zlib`.** `src/platform/` runs in the Chain
  webview, not Node — confirmed nothing in this repo already imports
  `zlib` or a gzip package. The webview's `CompressionStream`/
  `DecompressionStream("gzip")` look like a drop-in replacement for
  `gzipSync`/`gunzipSync` on a `Uint8Array`, but this needs checking
  live before it's load-bearing (see Open questions) — the detail
  files are a size optimization, not a correctness requirement, so an
  uncompressed fallback is an acceptable landing spot if the streams
  API turns out to be unavailable in `chain dev`.

## Target boundary

- `src/shared/lib/api-studio/scanners/` — ported as is, mirroring
  Electron's layout including the `openapi/` subfolder.
- `src/shared/lib/api-studio/rules/` — the six missing rule files plus
  `types.ts` and `index.ts`, added beside the already-ported
  `environment-policy.ts`.
- `src/shared/lib/api-studio/reading/`, `.../yaml/` — new, ported as is
  (no OS or Node dependency in either).
- `src/shared/lib/api-studio/project-inventory.ts`, `workspaces.ts`,
  `route-identity.ts`, `route-index-format.ts`, `scan-project-routes.ts`
  — ported, `project-inventory.ts` taking a `ProjectReader` as described
  above.
- `src/shared/lib/api-studio/route-cache.ts` — ported, calling
  `src/platform/folders.ts` directly (see above).
- `src/platform/api-studio.ts` (new) — `scanProjectRoutes(projectPath)`
  calls `scanProjectRoutes` then `saveRouteScan`; `readProjectRoutes`
  calls `readRouteScan`; `readRouteDetails` calls it directly. Each
  wraps `projectReader(projectPath)` from `folders.ts` the way
  `src/shared/lib/stack-detection` callers already do.
- `src/platform/lazify.ts`: the three members move off
  `rejects(unported.apiStudio)` onto `apiStudioGroup.scanProjectRoutes`
  etc. The other 20 members in the group stay rejecting — this ticket
  does not touch environments, requests, scripts, collections, host
  consent, or docs.

## Confirmed real API reference

None yet — no Chain capability beyond `desktop.folders` (already
shipped, request 01) is needed for this slice. `src/platform/folders.ts`
already exposes everything `route-cache.ts` needs
(`readTextFile`/`writeTextFile`/`readFileBytes`/`writeFileBytes`/
`listFolder`/`pathExists`/`deletePath`/`movePath`); none of it is new.

## Execution steps (small commits)

1. `yaml/`, `reading/` — pure, no boundary change; port and get their
   existing tests passing first since nothing else in this slice can
   be exercised without them (the OpenAPI scanner needs `yaml/` for
   non-JSON docs; the `aspnet` rule needs `reading/`).
2. `rules/` (the six missing files, `types.ts`, `index.ts`) and
   `scanners/` — pure; port together since the scanner engine and the
   rules it drives are one call graph (`framework-scanner.ts` takes a
   `FrameworkRule`).
3. `project-inventory.ts` onto `ProjectReader`, then `workspaces.ts`,
   `route-identity.ts`, `scan-project-routes.ts` — this is where the
   project-reading boundary actually changes; isolate it from step 2
   so a scanner test failure can't be confused with a reader-wiring
   failure.
4. `route-index-format.ts`, `route-cache.ts` — the persistence half;
   land the gzip-or-fallback decision here once checked live (Open
   questions).
5. `src/platform/api-studio.ts`, then flip the three `lazify.ts`
   members and wire `use-route-scan.ts`'s real call in the app.

## Acceptance checklist and evidence

- [x] `openapi-scan.test.ts`, `framework-rules.test.ts`,
      `monorepo-scan.test.ts`, `aspnet-scan.test.ts`,
      `php-python-frameworks.test.ts`, `route-identity.test.ts`,
      `yaml-reader.test.ts`, `return-types.test.ts` all port and pass
      unchanged (characterisation, same as ticket 002's golden suite):
      95 cases across the two suites plus route-cache
- [x] `route-cache.test.ts` passes against the gzip implementation
      (`CompressionStream`/`DecompressionStream`, verified under Node;
      live WebKit check still open, see below)
- [ ] A real project with each supported framework (at minimum one
      JS/TS stack with an OpenAPI doc, one Express source-scanned
      stack) scanned in the app: routes list matches what a person
      reading the source would expect, `scannersRun` names the right
      scanner, a second scan with no route changes keeps every
      `firstSeenAt`
- [ ] A monorepo with two workspaces scanned in the app: both
      services' routes appear, grouped by workspace, with no
      `/health`-vs-`/health` collision between them
- [ ] A project with no supported framework and no OpenAPI doc scanned
      in the app: the "no API description or supported framework was
      found" warning shows, not an error
- [x] `CI=true npm test` (744 of 744, whole repo), `npm run typecheck`,
      `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. The other 20
`api-studio` members keep rejecting as unported until their own
tickets.

## Rollback

Revert the commits; the three members go back to
`rejects(unported.apiStudio)`.

## Open questions

- Whether `CompressionStream`/`DecompressionStream("gzip")` is actually
  available to code running in `src/platform/` under `chain dev` —
  confirmed working under Node (this pass's test run), still needs a
  live check in the real WebKit webview; falling back to uncompressed
  detail files costs disk space on a large API, not correctness, so
  it is not a blocker on its own.
- D-7 (keychain for secrets) does not block this slice — route
  scanning never touches a secret — but `project-security.ts` and the
  OpenAPI `security.ts` scanner do read **scheme definitions** (which
  header/scheme a route needs), never a stored secret value. Worth a
  one-line note in whichever ticket resolves D-7 that this slice
  already shipped the read-only half.
- `route-cache.ts`'s stale-detail sweep now uses `listFolder`, which
  already answers `[]` for a missing directory (`folders.ts` catches
  `NOT_FOUND`) — confirmed by `route-cache.test.ts`'s first save (no
  `routes/` directory exists yet) passing, so this is resolved, not
  open.
- None of the five steps have run against the real app yet — only
  against `tests/platform/node-folders.ts`'s Node-backed fake of
  `desktop.folders`. The acceptance checklist's unchecked rows (a real
  project, a real monorepo, a real "nothing found" project, all
  scanned through the app's UI) are what's left before this ticket's
  row in `06-parity-matrix.md` can move past "Done in tests."

## Verification log

- 2026-10-15, macOS, Node (no OS-specific behaviour in this slice):
  95 characterisation cases pass across
  `tests/shared/lib/api-studio/{openapi-scan,framework-rules,
  monorepo-scan,aspnet-scan,php-python-frameworks,route-cache,
  yaml-reader,return-types,route-identity}.test.ts`, ported unchanged
  from Electron apart from the test harness swap (real `node:fs`
  temp projects, same as Electron, against
  `tests/platform/node-folders.ts`'s fake of `desktop.folders` rather
  than Electron's own code). Whole-repo `CI=true npm test`: 744 of 744
  pass (including the one existing test this ticket had to update,
  `tests/platform/lazify.test.ts`, which asserted `readProjectRoutes`
  was still unported). `npm run typecheck` and `npm run build:web`:
  clean. Not yet run: the real app.
