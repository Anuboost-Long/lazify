# 00 — Electron baseline

The reference implementation every new-stack slice is compared against.
Record it once; only append corrections, never rewrite it.

## Source revision

| Item | Value |
| --- | --- |
| Recorded | 2026-10-09 |
| Branch | `main` (tracks `origin/main`, `https://github.com/Anuboost-Long/lazify.git`) |
| Commit | `c9abefccdc9f2cf48ddecd2786e776dfd06afb66` — "Refine desktop workspace" |
| App version | `1.0.0` (`package.json`) |
| Runtime | Electron `^43.2.0`, `node-pty ^1.1.0`, SQLite through Electron's built-in `node:sqlite` |
| Local Node | `v22.23.2` |

**The worktree was not clean when this was recorded.** There were 20 modified files:
the agent monitor, rail panels, usage panel and task panel components, the three
locale files plus `translation.ts`, and `styles.css`. These are in-progress
product work, not part of the rewrite. The proposed baseline tag is still
pending: commit or set aside that work first, then tag a clean commit (see
"Proposed baseline tag").

## Commands

| Purpose | Command |
| --- | --- |
| Develop (renderer + main + preload + Electron) | `npm run dev` |
| Build | `npm run build` (`build:renderer` then `build:electron`, which includes `build:preload`) |
| Package | `npm run package:mac`, `package:win` and `package:linux` (each uses its own `electron-builder.*.yml`) |
| Tests | `npm test` (Vitest) · `npm run test:e2e` (`vitest.e2e.config.ts`) |
| Typecheck | `npm run typecheck` (`tsconfig.json` and `tsconfig.node.json`) |
| Lint | `npm run lint` |
| Translations | `npm run make:lang` regenerates `src/renderer/i18n/translation.ts`. Never hand-edit that file. |
| Marketing site | `website/`, a separate Next.js app (`npm run dev:website`). Out of scope for the rewrite. |

## Baseline results (on the dirty worktree above, macOS)

| Check | Result |
| --- | --- |
| `npx vitest run` | **1 failed**, 1152 passed (148 files, about 22 s) |
| `npm run typecheck` | Pass |
| `npx eslint .` | Pass: 0 errors, 32 warnings (mostly `no-console` in `src/scripts/`) |
| `npm run test:e2e` | Not run yet |

### Known pre-existing failure

`tests/renderer/env-pane.test.ts`, test "refuses a name the file already has,
without calling main". It expects the text `env_pane.duplicate_name`. The key
still exists in `src/renderer/i18n/lang/*.json`, but no component under
`src/renderer` renders it any more. The failure reproduces when the file runs
alone, and none of the uncommitted files touch the env pane, so it existed at
HEAD. It is **not** a rewrite regression. Fix it on its own product branch; do
not delete the test.

## OS matrix

| OS | Electron build config | Rewrite verification |
| --- | --- | --- |
| macOS | `electron-builder.mac.yml` (DMG and zip, with signing hooks `src/scripts/mac-adhoc-sign.mjs` and `mac-after-pack.mjs`) | Baseline recorded here |
| Windows | `electron-builder.win.yml` | Not tested |
| Linux | `electron-builder.linux.yml` | Not tested |

Chain SDK currently has no verified capability on Windows or Linux
(`chain-sdk/docs/CAPABILITY_MATRIX.md`). See decision D-2 in
`04-architecture-decisions.md`.

## Proposed baseline tag

After the in-progress work above is committed (or deliberately set aside), tag
the clean commit and keep a runnable reference checkout:

```bash
git tag legacy/electron-baseline-YYYYMMDD <clean-commit>
git worktree add ../lazify-electron-reference legacy/electron-baseline-YYYYMMDD
```

Not done yet. Both commands need the owner's go-ahead.
