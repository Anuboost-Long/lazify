# 021 — Environment files (Phase 5 / In progress)

**Read this whole ticket before touching code.** The `env` group (6
members) on Chain: list a project's root `.env*` files, read one, and edit
it one line at a time.

## Goal

The Agents page's Environment panel and the workspace's env editor work
on Chain as they do in Electron. Ends ticket 020's F2 (the panel showing
"No .env file" next to an error).

## Source-of-truth references

- Roadmap row: Phase 5, "environment-file editor"
- Old source: `src/main/projects/env/` (`env-store.ts`, `parse-env.ts`,
  `index.ts`), `src/main/ipc/env.ts`
- Public API: `env` in [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: `tests/main/projects/env-files.test.ts` (parser, renderer,
  store; 25 cases)
- Persistent data touched: the user's own `.env*` files, in folders they
  granted
- Required OS behaviour: none beyond file access

## Current observable behaviour

Every edit re-reads the file, changes one line and writes it back, so a
hand edit between two panel edits is noticed, not overwritten. An edit
aimed at a line whose key has moved fails with "<KEY> is no longer on
line N — the file changed on disk." Creating a file never truncates one
that appeared in the meantime (`wx`).

## Target boundary

- `src/shared/lib/projects/env/`: Electron's three files, unchanged
  except imports (`@/platform/fs`, `@/shared/lib/path`,
  `@/shared/types/env`).
- `src/platform/fs.ts` gains `writeFile`. `wx` (create, never truncate)
  writes an empty temporary file beside the target and moves it into
  place with `desktop.folders.move`, which refuses an existing target.
  Chain has no create-only write; `move`'s refusal gives the same
  guarantee, so no Chain request.
- `src/platform/lazify.ts`: the 6 members replace their stubs.
- Trust boundary: only folders the user granted. Electron's own check
  (a root-level `.env*` name, resolved back into the project) stays.

## Acceptance checklist and evidence

- [x] Electron's env tests pass on the copy, unchanged except imports
      (`tests/shared/lib/projects/env-files.test.ts`, 24 cases)
- [x] `wx` on Chain: an existing file is never truncated, and no staging
      file is left either way (`tests/platform/fs.test.ts`)
- [x] In the app, through the bridge, on a scratch project in the app's
      temp folder: create, add, disable, change a value to one with a
      space, delete. The file on disk read back each time with only that
      line changed (`# PORT=3000`, `API_URL="https://example.test/a b"`).
      A second create failed with EEXIST and left no staging file; a stale
      line and `../x.env` were refused with Electron's messages. Scratch
      folder deleted afterwards
- [x] Ticket 020's F2 is gone: the Environment panel on lazify shows "No
      .env file in this project." with no error, which is now true (the
      repository has no root `.env`)
- [ ] The panel rendering a real file. Needs a synced project with a
      `.env`, so a person at the folder picker (pairs with ticket 017's
      picker check)
- [x] `CI=true npm test` (373 passed) and `npm run typecheck` pass

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Rollback

Revert the commit; the 6 members go back to their stubs.

## Verification log

- 2026-10-10, macOS: tests and the bridge run above, through
  `chain inspect` on the running app.
