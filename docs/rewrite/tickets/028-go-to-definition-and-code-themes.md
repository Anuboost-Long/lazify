# 028 — Go to definition and code themes (Phase 5 / Done)

**Read this whole ticket before touching code.** Go to definition in the
read-only editors (`findSymbolDefinition`) and the user's own syntax
themes and grammars (`listHighlightingAssets`,
`openHighlightingFolder`), on Chain. The rest of the old 028 row is
split: extensions are 029, linting is 030 (waits on
[request 16](../../chain-sdk-requests/16-byte-exact-process-output.md)).

## Goal

- Clicking a name in a read-only editor opens the file and line that
  declares it, as Electron ranks it: the file named after the symbol
  first, then index barrels, then shortest paths; an exported
  declaration ends the search; imports and re-exports are followed; JSX
  attributes and import paths resolve.
- The Appearance settings list the themes and grammars dropped into the
  app's `highlighting/` folder, and "Open folder" opens it.

## Status — 2026-10-14

Done on macOS. Both golden results recorded from Electron match (20
go-to-definition questions on one project, and the highlighting folder
empty and filled). In the app, on the Electron repo: hits in 3–110 ms
warm, a miss in 135 ms, the highlighting folder created. No Chain
request needed. Left: clicking a name in the editor, and "Open folder".

## Source-of-truth references

- Roadmap row: Phase 5 "code quality" (split)
- Old source: `src/main/code-intelligence/{symbol-finder,reference-finder,module-resolver,jsx-context,highlighting-store}.ts`,
  `src/main/ipc/code-intelligence.ts`
- Public API: `code-intelligence.findSymbolDefinition`,
  `system.listHighlightingAssets`, `system.openHighlightingFolder` in
  [`../02-contract-manifest.md`](../02-contract-manifest.md)
- Old tests: none, so a characterisation fixture is added
- Persistent data touched: `<appData>/highlighting/` (created with its
  README, as Electron does)
- Required OS behaviour: `open` for the folder

## Current observable behaviour (Electron)

- `findSymbolDefinition(projectPath, symbol, fromPath?, position?)`: an
  import specifier goes to the module resolver, anything else to the
  reference finder; the answer is `{ absolutePath, relativePath, line,
  kind }` or null. The project walk is breadth-first, skips the ignored
  folders and symlinks, keeps source extensions, stops at 6,000 files,
  skips files over 512 KB, and is cached for 30 s per project.
- `listHighlightingAssets()` creates `themes/`, `languages/` and the
  README when missing, then reads every `*.json` in each (malformed ones
  skipped) and `extensions.json`.

## Target boundary

- Copied to `src/shared/lib/code-intelligence/` (replacing the type-only
  stand-ins). `jsx-context.ts` is pure and copied as is.
- The walk is one recursive `listFolderTree` skipping the ignored
  folders, then the same breadth-first order and 6,000 cap from that
  listing. File text through `readFileBytes` with Node's lossy UTF-8
  decode; sizes from the listing.
- The module resolver's "is this candidate a file" uses the batched
  `test -f` (follows links, as `fs.stat` did) for all candidates at once.
- **Fewer reads, same answer.** Electron read every ranked file and
  skipped those whose text didn't contain the symbol. One call per read
  here made a miss on the Electron repo take 7.6 s, so after the files
  named after the symbol, `grep -lF` (in batches of 500) picks the files
  that contain it, and only those are read, in the same ranked order.
  Identifiers are ASCII, so a byte search finds exactly the files the
  text search would.
- `highlighting-store.ts` uses `appDataPath()/highlighting` through
  `src/platform/folders.ts`; "Open folder" is `open <folder>`.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from Electron (`../scripts/definition-recorder/`)
      on a fixture project: exported and plain declarations, the file
      named after the symbol, index barrels, imports and re-exports
      followed, JSX attributes, relative and alias-free import paths,
      a symbol that isn't there, ignored folders, a symlink, a file over
      512 KB; and highlighting assets (themes with and without a type,
      a grammar, `extensions.json`, a malformed file, a non-JSON file).
      The Chain copy matches both
- [x] `CI=true npm test` (544 passed, 9 skipped), `npm run typecheck`,
      `npm run build:web` pass
- [x] In the app (`chain dev`, `chain inspect`), on `~/Work/lazify`:
      `PtyRunner` → `src/main/pty-runner.ts:58` (572 ms cold, 109 ms
      warm), a miss in 135 ms (7.6 s before the grep pass),
      `reconcileProjectStructure` through its import in 19 ms,
      `../tree-reconciler` in 8 ms, `@renderer/shared/ui/Tooltip` in 3 ms;
      `listHighlightingAssets` created the folder (16 ms)
- [ ] A name clicked in the read-only editor, and "Open folder"

## Not removed

Nothing. Nothing in the Electron repo is changed.

## Rollback

Revert the commit; the members go back to their stubs.

## Open questions

- Electron's file-name fallback never fires for a file that doesn't
  mention the symbol (`export default () => null` in `Anonymous.tsx`
  gives null), because the "does it contain the name" check runs first.
  Kept for parity.
- `highlighting/` is the user's drop-in folder for their own themes and
  grammars, not downloaded data as `03-data-inventory.md` says. Should
  the first-launch import (ticket 012) copy it? It is empty on this Mac.

## Keeping the two copies in step

```sh
npx vitest run --root docs/rewrite/scripts/definition-recorder
```

Move the snapshot over
`tests/shared/lib/code-intelligence/__snapshots__/definition.golden.test.ts.snap`,
then check with `CI=true npm test`.

## Verification log

- 2026-10-14, macOS 27.0.1 arm64: fixture recorded from Electron at
  `c9abefc`, copy matches; the app run above on the owner's `chain dev`.
