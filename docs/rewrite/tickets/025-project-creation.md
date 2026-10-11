# 025 — Starter catalog and project creation (Phase 5 / Done)

**Read this whole ticket before touching code.** The stack catalog and
creating a project from a stack on Chain: `listTemplates`,
`getTemplatePackageManifest`, `createProject` (stack mode) and
`checkEnvironment`, with the progress events, failure reasons and
clean-up Electron has. Creating from an imported template waits for
ticket 026.

## Goal

The Init flow lists Electron's four stacks, and Create Project produces
the same project Electron does, through the same two tiers:

- **Starter tier** (Next.js, Expo): shallow `git clone` of the pinned
  starter tag, drop its history, `starter.json` and `excludeFromCopy`,
  rename the package, apply declared substitutions, replace
  `lazify_scaffold` everywhere, install, `git init` + first commit, move
  into the chosen folder.
- **CLI tier** (Vite React, bare React Native): run the stack's create
  command with the name in its slot and the chosen option flags, install
  post-install dependencies, resolve the package manifest against npm,
  install what's missing, move into the chosen folder.

Every failure says what broke: git missing, offline, starter not
reachable, clone failed, the create command failed, installation
failed, a project already at the destination.

## Status — 2026-10-11

Done on macOS. 21 of 21 golden `createProject` results recorded from
Electron match; Electron's five scaffolding tests (25) pass on the copy.
In the running app, through the bridge: the real Next.js starter (clone
from GitHub, `npm install`, first commit) and a real `npm create vite`
project (with npm's peer conflict going through the `--legacy-peer-deps`
retry) were created, and three failures named themselves. Request 14
(copy across volumes) was sent and shipped the same day. Left: clicking
through the Init screens, and a workspace on another drive.

## Source-of-truth references

- Roadmap row: Phase 5 "project creation"
- Old source: `src/main/scaffolding/{catalog,harmonizer,starter-descriptor,starter-name-token,starter-provisioner,template-package-manifest,prepared-projects,workflow-engine}.ts`,
  `src/main/scaffolding/workflow/{create,prepare,finalize}.ts`,
  `src/main/ipc/{templates,workflow,environment}.ts`, the seed catalog
  `templates/*.json` and `templates/packages/*.json`
- Public API: `templates.listTemplates`, `templates.getTemplatePackageManifest`,
  `workflow.createProject`, `environment.checkEnvironment` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md);
  `onWorkflowProgress` is already on Chain (ticket 022)
- Old tests: `tests/main/{starter-catalog,starter-descriptor,starter-name-token,starter-provisioner,prepared-projects}.test.ts`;
  nothing covers `createProject` end to end, so a characterisation
  fixture is added
- Persistent data touched: none of the app's. A staging folder under
  `appFolder("temp")`, then the new project in the folder the user chose
- Required OS behaviour: `git`, `node`, `npm`/`yarn`/`npx` on `PATH`;
  network for the clone and npm

## Current observable behaviour (Electron)

- `createProject` scans the environment first and throws its issues
  (Node under 18, neither npm nor yarn). It throws without a stack, for
  an unknown stack, and when the destination already exists.
- Starter tier progress: `preflight`, `create-project` (cloning),
  `starter-ready`, `install-dependencies`, then `complete`
  (`success`). A clone failure emits `error` with git's own words and
  returns `reason`; the staging folder is removed. A failed `git init`
  only adds a `git-init` notice; the project still succeeds.
- CLI tier progress: `preflight`, `create-project`, optional
  `install-template-dependencies`, `resolve-package-versions`,
  `package-version-check`, `install-manifest-dependencies`,
  `install-manifest-dev-dependencies`, `complete`. npm and yarn retry
  with `--legacy-peer-deps` / `--ignore-engines` (`dependency-auto-fix`).
- A failed install after a successful prepare returns `success: false`
  with the **staging** path, and leaves the staging folder behind.
  Recorded as Electron does it.
- There is no cancel. The picker step (`prepareProject`, choose files,
  `finalizeProject`, `discardPreparedProject`) exists in the engine but
  no IPC calls it: `createProject` runs both steps with no choices.

## Target boundary

- Seed catalog copied to `templates/` in this repo, read with Vite's
  `import.meta.glob` (bundled, so it works offline on first run as
  Electron's did). Electron's registry ladder (`REGISTRY_PIN`, cache,
  `refreshCatalog`) is not ported: the pin is `null` in Electron, so it
  never runs. Port it when Electron sets a pin.
- Copied, with file access moved to `src/platform/folders.ts` and
  `git` to `@/platform/exec`: `starter-descriptor.ts`,
  `starter-name-token.ts` (walks with one recursive `list` that skips
  the same folders), `starter-provisioner.ts`,
  `template-package-manifest.ts`, `prepared-projects.ts`,
  `workflow/{create,prepare,finalize}.ts`, `harmonizer.ts`'s
  `listTemplates`/`getTemplate`.
- `prepared-projects.ts` stages under `<appFolder("temp")>/staging/<id>/`
  instead of `os.tmpdir()`, and places the project with
  `desktop.folders.move`, which copies across volumes since request 14
  (links and modes kept), as Electron's `EXDEV` fallback did. When the
  copy is in place but Chain couldn't remove the source, the project is
  kept and the staging folder deleted again.
- `starter-name-token.ts` walks with one recursive `list` skipping the
  same folders, and skips files over 1 MB from the listing's size.
  `git clone` runs with the staging folder as its working directory.
- Not ported: `WorkflowEngine` (the platform layer calls the functions),
  `discardPreparedProject` (nothing calls it), the imported-template
  branch (026: `createProject` with `sourceMode: "imported"` keeps
  saying templates aren't available yet).
- `checkEnvironment` is `scanEnvironment`, already on Chain (ticket 005);
  the Init flow calls it on open, so it moves here from ticket 027.
- Trust boundary: the destination must be inside a granted folder (the
  Init flow's folder picker grants it). A typed path outside every grant
  fails with Chain's `NOT_GRANTED`, which the flow shows.

## Acceptance checklist and evidence

- [x] Electron's five scaffolding tests (25) pass on the copy
      (`tests/shared/lib/scaffolding/`), with real `git` and real folders
- [x] Golden fixture recorded from Electron's `createProject`
      (`../scripts/creation-recorder/`, 21 snapshots; scenarios in
      `tests/shared/lib/scaffolding/creation.cases.ts`): fake tools, npm
      and registry, a starter tree with history, CI, descriptor and the
      name token. Starter: Next and Expo succeed, offline, tag missing,
      other clone failure, git missing, install failing (staging kept, as
      in Electron), `git init` and `git commit` failing, destination
      taken. CLI: Vite with compatible latest versions and one kept pin,
      registry offline into a new folder, create failing, auto-fix
      failing, npm missing (npx and yarn), bare React Native through npx,
      nothing to run it with. No stack, unknown stack, Node too old,
      neither npm nor yarn. The Chain copy matches all 21
- [x] `CI=true npm test` (487 passed, 9 skipped), `npm run typecheck`
      and `npm run build:web` pass; the catalog is in the bundle
- [x] In the app (`chain dev`, `chain inspect`): `listTemplates` gave
      the four stacks, `checkEnvironment` no issues,
      `getTemplatePackageManifest("vite-react")` the five packages.
      `createProject` into a folder under the app's temp folder: Next.js
      starter in 12 s (`next-probe` everywhere, no `lazify_scaffold`
      left, one "Initial commit", `.bin` links intact, staging emptied);
      Vite React in 10 s. Failures: destination taken, a folder outside
      every grant, imported mode (026)
- [ ] The Init screens clicked through with the folder picker
- [ ] A workspace on another drive (request 14)
- [ ] Windows (D-2)

## Differences from Electron

- **The user's Node is checked**, not Electron's (ticket 005). The
  recorder gives Electron's `process.version` the case's version, so the
  rest of the flow is compared.
- **The workspace must be a granted folder.** Electron could create a
  project at any typed path; here a path outside every grant fails with
  "… is outside every folder the app was granted" before anything is
  cloned. The Init flow's picker grants the folder it returns.

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the members go back to their stubs.

## Open questions

- A workspace folder remembered from Electron (`lazify-project-directory`,
  imported by ticket 013) isn't granted until the user picks it again.
  The error names the folder, but doesn't say to pick it. Worth a
  clearer message, or asking the picker to grant it, when the Init
  screens are clicked through.

## Keeping the two copies in step

To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/creation-recorder
```

Move the snapshot it writes over
`tests/shared/lib/scaffolding/__snapshots__/creation.golden.test.ts.snap`,
then check with `CI=true npm test`.

## Verification log

- 2026-10-11, macOS arm64, Node 22.23.2: fixture recorded from Electron
  at `c9abefc`, copy matches; the app run above (dev build running, the
  frontend hot-reloaded). `next-scaffold@v1.0.0` cloned from GitHub. The
  scratch projects were removed afterwards. chain-core's cross-volume
  `move()` needs a `chain dev` restart and wasn't exercised.
