# Lazify

A GUI-driven desktop developer workflow launcher — Electron + React + TypeScript
+ Tailwind. Scaffold a project, run its commands, drive coding agents, and read
the output without leaving the window.

This is the **private source repo**. Nothing here is public. Releases, the
installer and the update feed live in
[`Anuboost-Long/lazify-dist`](https://github.com/Anuboost-Long/lazify-dist),
which is public by necessity — the updater and `install.sh` read release assets
anonymously, and a token shipped inside the app is not an option.

---

## Getting set up

Node 22 (what CI uses) and yarn.

```bash
yarn install   # postinstall does real work — see below
yarn dev       # renderer, main-process tsc --watch, and Electron together
```

`postinstall` runs three things you will notice if they fail:

1. `patch-package` — applies `patches/node-pty+1.1.0.patch`.
2. `electron-rebuild -f -w node-pty` — node-pty is native and must be compiled
   against Electron's headers, not the system Node's. **A build made on one
   platform is not portable to another**, which is why releases are built on a
   macOS runner and a Windows runner rather than one machine.
3. `src/scripts/mac-fix-electron.mjs` — macOS only.

If the terminal panes come up dead after switching Node or Electron versions,
`yarn rebuild` re-runs step 2 on its own.

## Layout

```
src/main/        Electron main process — agents, browser, scaffolding,
                 diagnostics, the PTY runner, the updater
src/preload/     the contextBridge surface, the only path between the two
src/renderer/    React app: features/*, shared/*, i18n/
src/brain/       stack detection, template engine, package-version matching
src/scripts/     build-time helpers (signing, language codegen)
templates/       starter definitions, bundled into the app as extraResources
tests/           mirrors src/ — never co-located with the code
website/         the marketing site (separate Next.js app, own package.json)
docs/            release checklist and scaffolding notes
```

Two TypeScript projects: `tsconfig.json` (renderer) and `tsconfig.node.json`
(main/preload). CI typechecks both — check both before pushing.

## Tests

```bash
yarn test        # vitest run — 151 tests across 29 files
yarn test:watch
```

A couple of suites (`command-runner-prompts`, `starter-provisioner`) spawn real
processes and shell out to real `git`, so they are slow by nature and carry a
30s timeout rather than vitest's 5s default. If you see them time out, the
machine was busy — that is the failure mode they were tuned for.

## Translations are generated

Edit `src/renderer/i18n/lang/{en,kh,cn}.json`, then:

```bash
yarn make:lang
```

That regenerates `src/renderer/i18n/translation.ts`. **Never hand-edit
`translation.ts`** — the next codegen run will overwrite it.

## Packaging locally

```bash
yarn package:mac   # → release/mac
yarn package:win   # must run on Windows, for node-pty
```

macOS builds are **ad-hoc signed** (`identity: null` plus
`src/scripts/mac-adhoc-sign.mjs`). There is no Developer ID certificate yet, so
a downloaded build is flagged as "damaged" until the quarantine attribute is
cleared — which is the whole reason `install.sh` exists. Leaving signing to
electron-builder's auto-discovery is worse: it picks up the Apple *Development*
certificate, which is valid only on Macs provisioned for the team.

Both platforms ship a thin build per architecture rather than a universal
binary. Artifact names carry no version (`Lazify-arm64.dmg`), so
`releases/latest/download/...` stays a stable URL across releases.

## Cutting a release

Tagging is the release.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

`.github/workflows/release.yml` fires on any `v*` tag, builds on macOS and
Windows in parallel, and publishes to the dist repo with the `LAZIFY_DIST_TOKEN`
secret — a fine-grained PAT with `contents: write` scoped to **`lazify-dist`
only**. `workflow_dispatch` re-runs a failed publish without moving the tag.

Two things to keep straight:

- **The tag must match `package.json`.** The updater compares against the
  version in the package, not against the tag name.
- **`LAZIFY_DIST_TOKEN` must exist before you tag**, or the run fails at the
  publish step with everything else green.

See [`docs/1.0-release-checklist.md`](docs/1.0-release-checklist.md) for what is
still outstanding.

## Conventions

- Minimal diffs. Don't refactor code you were not asked to touch.
- ~200 lines a file, 500 is the red zone. Split components into their own files.
- Tests live in `tests/`, mirroring `src/`.
- Tailwind classes go through `clsx`, grouped by concern (border, bg, text) —
  see [`agent.md`](agent.md).
