# 024 — Formatting (Phase 5 / Done)

**Read this whole ticket before touching code.** The `formatting` group
on Chain: formatter settings, the settings preview, what a project
declares, and formatting the files a session changed, by hand or after
an agent's turn. Prettier runs under the user's Node (owner's choice,
2026-10-11).

## Goal

Formatting behaves as in Electron: the same Prettier (3.9.6), the same
project config lookup (every Prettier config spelling, the
`package.json` key, a config in a parent folder, `.prettierignore`),
the same organize-imports pass, preview before write, files written only
when they change, and the automatic pass after an agent's turn in auto
mode.

## Status — 2026-10-11

Done on macOS. 29 of 29 golden results from Electron match the bundled
formatter run with `node`; Electron's organize-imports test (12) and its
three formatting renderer tests (21) pass on the copy; settings, the
preview, formatting a project and the automatic pass checked in the
running app. Left: the Agents page's Format button and confirmation with
a real agent session.

## Source-of-truth references

- Roadmap row: Phase 5 "formatting"; comparison row "Formatting and code
  quality"
- Old source: `src/main/formatting/*`, `src/main/ipc/formatting.ts`,
  `main.ts` (`formatAfterTurn`, `lazify:code-formatted`)
- Public API: `formatting` in [`../02-contract-manifest.md`](../02-contract-manifest.md)
  (7 requests and `onCodeFormatted`)
- Old tests: `tests/main/formatting/organize-imports.test.ts`,
  `tests/renderer/{formatter-section,format-changes-panel,format-confirm-modal}.test.ts`;
  no test for the formatter itself, so a characterisation fixture was added
- Persistent data touched: `code-formatter.json` in the app's data folder
  (Electron's `userData` file, same shape, imported by ticket 012); the
  project's files, rewritten only by a write pass

## Target boundary

- **Why Node.** Electron called Prettier as a Node library. Its config
  lookup, ignore files and plugin loading read the disk through Node,
  and the webview has no Node. The owner chose running Prettier under
  the user's `node` over Prettier's browser build, which can't load
  `prettier.config.js` or config plugins.
- `node/formatter/`: the code that runs under Node, bundled with
  Prettier 3.9.6 into one file (`npm run build:formatter`, Rolldown,
  `node/formatter/dist/formatter.mjs`, not committed). `dev:web` and
  `build:web` build it first.
  - Copied unchanged: `organize-imports.ts`, `format-sample.ts`,
    `project-formatter.ts` (type import path only), `import-aliases.ts`
    (an unused callback parameter renamed `_match` for this repo's
    `noUnusedParameters`).
  - `format-files.ts` is Electron's `format-changed-files.ts` with the
    file list and settings passed in rather than read: the app owns both.
    `formatOne` is unchanged.
  - `main.ts` answers one call, given as a JSON argument
    (`src/shared/lib/formatting/worker-protocol.ts`), on stdout.
- `src/shared/lib/formatting/formatter-settings.ts`: Electron's, on
  `desktop.folders`, so async.
- `src/platform/formatting.ts`: writes the bundled formatter to
  `<appFolder("data")>/formatter/formatter-<sha1>.mjs` (removing a copy from
  an earlier build), runs `node` on it through `process-runner` with the
  app's data folder as its working directory, takes the changed files from
  `getWorkingChanges` when none are named, and runs the automatic pass,
  called from `src/platform/agents.ts` where an agent's turn ends (as
  Electron's `emitTurnDone` did).
- Without Node, each file is reported failed with "Formatting needs
  Node.js, which wasn't found. Install Node.js, then try again.", so the
  changes panel says why. `projectFormatter` answers no config, and the
  settings preview keeps its last sample, as Electron did on an error.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from Electron's code
      (`../scripts/formatting-recorder/`, 29 snapshots) on real folders:
      no config (preview leaves files alone, then write; a syntax error,
      an unknown file type, an ignored file, a deleted file, a path
      outside the project, a file over 2 MB, a folder), a second write
      changing nothing, organize imports off, changed app defaults,
      `.prettierrc` with overrides, the `package.json` key, a
      `prettier.config.mjs` naming a plugin, a broken config, a config in
      a parent folder, a missing project, and the settings sample twice.
      The bundled formatter, run with `node` from outside the project,
      matches all 29 (`tests/node/formatter/`). Raising the 2 MB limit
      failed the fixture, then was reverted
- [x] Electron's organize-imports test (12) and its formatter-section,
      format-changes-panel and format-confirm-modal tests (21) pass on
      the copy, with Electron's jsdom and Testing Library versions
- [x] `tests/platform/formatting.test.ts` (7): settings in Electron's
      file and shape; the formatter installed once and an earlier build's
      copy removed; run under `node` from the app's folder; every changed
      file when none are named; Node missing; the automatic pass only in
      auto mode, and reported only when it did something
- [x] In the app (`chain dev`, `chain inspect`), on a scratch Git project
      in the app's temp folder: preview reported `app.ts` without writing
      it; write formatted it with its imports grouped, left `clean.ts`
      unchanged and reported `broken.ts` with Prettier's message. First
      call 1.2 s (install and Node start), then about 250 ms. Settings ›
      Formatting showed the sample from the formatter; "Prefer single
      quotes" changed the sample and the saved file, and back. In auto
      mode, the pass after a turn formatted the change and sent one
      `onCodeFormatted`; in manual mode, and with nothing to change, none
- [x] `npm run build:web` passes; the formatter is its own chunk
      (5.2 MB, 1.4 MB gzipped), loaded on first use
- [x] `CI=true npm test` (441 passed, 9 skipped) and `npm run typecheck`
      pass, also without a built formatter
- [ ] Left: the Agents page's Format button and its confirmation, with a
      real agent session (covered by Electron's renderer tests on the copy)
- [ ] Windows (D-2)

## Differences from Electron

- **Needs Node** (approved by the owner, 2026-10-11).
- **A config edit is seen at once.** Electron's Prettier cached each
  resolved config for the app's lifetime, so an edited `.prettierrc` took
  effect after a restart. Each call here is a new process. Not visible in
  the fixture.

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Rollback

Revert the commit; the members go back to their stubs and the
`formatter` folder in the app's data folder is unused.

## Keeping the two copies in step

Until the Electron app is retired, a change to these files in either repo
must be made in both. To re-record the fixture from the Electron code:

```sh
npx vitest run --root docs/rewrite/scripts/formatting-recorder
```

Move the snapshot it writes over
`tests/node/formatter/__snapshots__/formatting.golden.test.ts.snap`
(only the file name differs), then check with `CI=true npm test`.

## Open questions

- **Project plugins never load, in Electron or here.** Prettier's API
  resolves a config's `plugins` from the process's working directory,
  not the project, so a project whose config names a plugin (for example
  `prettier-plugin-tailwindcss`) can't be formatted: every file comes
  back unchanged. The fixture records this. Running the formatter from
  the project's folder would load them. That's a deliberate change for
  the owner to approve, then re-record from Electron and note in the
  parity matrix.

## Verification log

- 2026-10-11, macOS arm64, Node 22.23.2, Prettier 3.9.6: fixture recorded
  from Electron at `c9abefc`, copy matches; the app run above. The scratch
  projects and `code-formatter.json` were removed afterwards, so the
  first-launch import still finds no settings file in the way.
