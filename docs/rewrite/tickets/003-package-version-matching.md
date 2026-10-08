# 003 — Package version matching (Phase 1 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: the
ported matcher reproduces the Electron app's reports against a fake npm
registry, and matches Electron on two real projects against the live
registry.

## Goal

Port the Electron app's package version matcher into this repo (A-4: copy,
proven by golden fixtures). The Electron app is not changed. The matcher
picks the project's anchor package (Expo, React Native, Next.js or React),
checks every dependency against it using Expo's compatibility table or npm
peer dependencies, and returns what to keep, update or downgrade, with an
install plan. The workspace's package version pane and template
provisioning use it.

## Status — 2026-10-09

- Ported to `src/shared/lib/package-version-matcher/` (this repo).
- `tests/shared/lib/package-version-matcher/version-matcher.golden.test.ts`
  passes against a fixture **recorded from the Electron code** at baseline
  `c9abefc`. Electron had no tests for this module, so the fixture is a
  characterisation: 7 projects run against a fake npm registry
  (`version-matcher.cases.ts`), plus tables for `satisfies`,
  `compareVersions`, `stripRangePrefix` and `isPreRelease`. The snapshot
  also lists every registry request, with its `Accept` header.
- `src/platform/registry.ts` sends registry requests through
  `desktop.http`; `src/platform/folders.ts` (ticket 002) reads
  `package.json`.
- Verified in the running app on two real projects against the live
  registry. The results are identical to Electron's.

## Source-of-truth references

- Roadmap row: Dependencies (version fixes).
- Electron source (unchanged), `src/brain/package-version-matcher/`:
  `index.ts`, `types.ts`, `semver-utils.ts`, `read-project-packages.ts`,
  `version-matcher.ts`, `sources/expo-compat.ts`,
  `sources/peer-dep-compat.ts`.
- Electron callers: `src/main/ipc/packages.ts`,
  `src/main/scaffolding/template-package-manifest.ts`, and the renderer's
  `features/workspace/components/PackageVersionPane.tsx`.
- Electron tests: none.
- Persistent data touched: none. It reads `package.json` and the npm
  registry, and installs nothing itself.

## What changed in the copy, and why

`index.ts`, `types.ts` and `semver-utils.ts` are byte-identical. The others
used Node's `fs` and the global `fetch`:

- **New `registry.ts`.** A `RegistryFetch(url, { accept, timeoutMs })`
  that resolves to the parsed JSON, to `null` for a response outside
  200–299, and rejects when the request fails. The sources call it where
  they called `fetch`. Their `try`/`catch` fallbacks are unchanged, and so
  are the URLs, `Accept` headers and timeouts.
- **`src/platform/registry.ts`** implements it with `desktop.http.get`. It
  sends the same `User-Agent: lazify/0.1.0`, accepts every status, and
  rejects a body that isn't JSON (Electron's `response.json()` threw there).
- `matchPackageVersions` takes `project` (a `ProjectReader`) and `registry`
  next to `projectPath`. A missing `package.json` still rejects, now with
  "No package.json found." instead of Node's `ENOENT` message.

## Electron behaviour carried over, for the owner to decide

The anchor's own version is checked against peer ranges for a different
package:

- **Next.js:** each dependency's `react` peer range is checked against
  **Next's** version. In the fixture, a library needing `react ^18` is
  called incompatible with a Next 14 app on React 18.3.1, and "fixed" by a
  version whose range happens to accept `14.2.3`.
- **Expo:** a package missing from Expo's table has its `react-native` peer
  range checked against **Expo's** SDK version. On Infinity_MobileApp
  (Expo 54) this is the likely source of the one suggested change,
  `@react-native-async-storage/async-storage@3.1.1`, in both apps.

The fix is to check each peer range against the installed version of the
peer package itself (`react`, `react-native`). That would be a "Different by
design" change, like ticket 002's.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from the Electron code, not from the copy, by
      `../scripts/version-matcher-recorder/` with `fetch` stubbed by the
      same fake registry
- [x] Every path covered: keep, update, downgrade; compatible, incompatible,
      unknown; an unresolved package; a registry outage; non-registry specs;
      scoped packages; pre-releases skipped when searching versions
- [x] `CI=true npm test` passes (85 tests, 9 skipped from ticket 002)
- [x] Mutation checks: loosening `~` matching fails the `satisfies` table,
      and changing an `Accept` header fails 2 cases
- [x] `npm run typecheck` passes; `vite build` succeeds
- [x] Electron app untouched
- [x] Real projects through Chain, against the live registry: identical to
      Electron

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Keeping the two copies in step

Until the Electron app is retired, a change to version matching in either
repo must be made in both. To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/version-matcher-recorder
```

Copy the snapshot it writes over
`tests/shared/lib/package-version-matcher/__snapshots__/version-matcher.golden.test.ts.snap`
(only the file name differs), delete the recorder's `__snapshots__/`, then
check with `CI=true npm test`.

## Verification log

- 2026-10-09, macOS arm64. The recorder wrote 10 snapshots from Electron at
  `c9abefc`. Copied into this repo, `CI=true npx vitest run` passed. The `~`
  mutation was first missed, so the case `1.3.5` against `~1.2.3` was added
  and the fixture re-recorded; both mutations then failed as expected and
  were reverted.
- 2026-10-09, macOS arm64, `chain dev`. `matchPackageVersions` through
  `projectReader` and `registryFetch`, run in the app with `chain inspect`,
  against the live registry:
  - Infinity_MobileApp: anchor `expo@54.0.36`; 62 packages, 61 kept, 1
    update (`@react-native-async-storage/async-storage@3.1.1`); 4.4 s.
  - mneme: anchor `react@19.1.0`; 34 packages, all kept; 2.7 s.

  Electron's matcher on the same projects in Node gave identical reports.
