# 034 — API Studio: route inventory and scanners (Phase 6 / Proposed)

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

Proposed. Not started. The renderer is already live (ticket 015): the
Route Picker, `use-route-scan.ts` and everything under
`src/features/api-studio/` compile and render, backed by
`scanProjectRoutes`/`readProjectRoutes`/`readRouteDetails` in
`src/platform/lazify.ts` all answering `rejects(unported.apiStudio)`.
`src/shared/lib/api-studio/types.ts` is already ported byte-for-byte
(only its two imports rewritten), and `rules/environment-policy.ts`
came along for the ride since something else under `src/features/`
already needed it — both confirmed unchanged against Electron. No
other file this ticket touches exists yet in this repo.

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

- [ ] `openapi-scan.test.ts`, `framework-rules.test.ts`,
      `monorepo-scan.test.ts`, `aspnet-scan.test.ts`,
      `php-python-frameworks.test.ts`, `route-identity.test.ts`,
      `yaml-reader.test.ts`, `return-types.test.ts` all port and pass
      unchanged (characterisation, same as ticket 002's golden suite)
- [ ] `route-cache.test.ts` passes against whichever of gzip/
      uncompressed this ticket lands on
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
- [ ] `CI=true npm test`, `npm run typecheck`, `npm run build:web` pass

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
  needs a live check before step 4 is called done; falling back to
  uncompressed detail files costs disk space on a large API, not
  correctness, so it is not a blocker on its own.
- D-7 (keychain for secrets) does not block this slice — route
  scanning never touches a secret — but `project-security.ts` and the
  OpenAPI `security.ts` scanner do read **scheme definitions** (which
  header/scheme a route needs), never a stored secret value. Worth a
  one-line note in whichever ticket resolves D-7 that this slice
  already shipped the read-only half.
- `route-cache.ts`'s stale-detail sweep (`fs.readdir` over the detail
  directory, deleting anything not just written) assumes `listFolder`
  on a directory that may not exist yet behaves like Electron's
  `.catch(() => [])` — needs checking against `folders.ts`'s real
  error shape rather than assumed.

## Verification log

Nothing yet — proposed.
