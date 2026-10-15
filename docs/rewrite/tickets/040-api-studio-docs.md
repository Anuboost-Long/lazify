# 040 — API Studio: docs (Phase 6 / Done)

**Read this whole ticket before touching code.** Last of the eight
API Studio slices, and the last ticket in the whole API Studio
feature: the `apiDocs` group, 12 members plus the
`onCollectionDocDraftChanged` subscription. Turns a hand-built
collection into a shareable API document — a brief an agent can fill
gaps in, a rendered HTML/PDF document, cover branding, redaction of
anything that looks like a credential.

## Goal

Pick a collection, see what the scan already knows and what's still a
gap, hand those gaps to an agent (the user's own coding agent, via a
brief file — not a new AI integration), bring its answers back in,
and export a document that never leaks a token, an API key or a
password a saved example happened to carry.

## Status — 2026-10-15

Done, verified live. All 12 `apiDocs` members plus
`onCollectionDocDraftChanged` are real. **Every member of both
`api-studio` and `apiDocs` is now wired** — this closes out the
8-slice API Studio feature started at ticket 034.

`CI=true npm test`: 905 of 914 pass, 9 skipped (up from 881 — 24 new
cases: `collection-docs.test.ts` (23, exercising the whole render
pipeline — document, route-section, redact, curl, markup, theme, mark,
app-icon — in one pass) and `doc-draft-watch.test.ts` (1, a real
file-watch round trip)). `npm run typecheck` and `npm run build:web`
pass.

Three things made this different from every prior ticket in this
phase:

- **This is the first time the app uses `desktop.pdf` or
  `desktop.files`** — neither had a caller anywhere in this repo
  before. Electron's `render/pdf.ts` opens a hidden `BrowserWindow`
  and calls `webContents.printToPDF` directly; Chain's equivalent,
  `desktop.pdf.render(html, options)`, does the same job as a single
  capability call, returning a `desktop.files` reference rather than
  bytes — `src/platform/pdf.ts` (new) reads it back and deletes the
  managed copy, handing the caller plain bytes to put wherever it
  needs (via `@/platform/folders`, same as everywhere else). Verified
  live: a real 3-page PDF, confirmed with `file` and page count.
- **The brief/questions/draft flow needed no new capability at all.**
  `collectionDocBrief`/`writeCollectionDocBrief`/`collectionDocQuestions`/
  `importCollectionDocDraft` don't call an LLM — they build a prompt
  file (`renderTemplate`, ticket 001's own prompt-assembly code) for
  the user's *own* coding agent session to read and answer into a
  JSON file, which the app then reads back. Exactly the file-based
  handoff the rest of this app already uses for agent tasks; nothing
  here is an AI integration.
- **`watchCollectionDocDraft`/`unwatchCollectionDocDraft`/
  `onCollectionDocDraftChanged` split one Electron function into
  three.** Electron's `watchDocDraft(projectPath, collectionId, onChange)`
  returns a stop function directly; the **bridge**, not that function,
  already separates "start watching" (`Promise<boolean>`), "stop"
  (`Promise<void>`) and "subscribe to every change, however many
  watches are running" (`onCollectionDocDraftChanged`, a plain
  callback subscription) — the same shape `onAgentActivity` already
  uses elsewhere in this bridge. A `Map<collectionId, stop>` plus a
  `Set` of listeners (`watch-registry.ts`, new) replaces Electron's
  `${senderId}:${collectionId}` keying, since Chain has one window,
  not Electron's per-sender tracking. Verified live: watched a real
  scratch project, wrote its answer file for real, got the change
  event with the right collection id, imported the real answer.

Everything else — `custom-collections.ts`'s gap detection
(`gaps.ts`/`outline.ts`), the whole HTML renderer (`render/document.ts`,
`route-section.ts`, `redact.ts`, `curl.ts`, `theme.ts`, `app-icon.ts`,
`mark.ts`, `page-script.ts`) and `doc-store.ts` — is pure or the same
app-wide-JSON-store shape every prior ticket this phase already used,
and needed only the mechanical `node:fs`/`app.getPath` → async
`@/platform/folders`/`appDataPath()` treatment.

## Source-of-truth references

- Roadmap row: Phase 6, eighth (last) row of the API Studio breakdown
  in `../05-work-queue.md`
- Old source (unchanged), `src/main/api-studio/docs/`:
  - `gaps.ts` (97), `doc-store.ts` (165), `outline.ts` (69,
    re-exports `gaps.ts`), `brief.ts` (247), `questions.ts` (119),
    `job.ts` (132), `index.ts` (189), `draft-watch.ts` (43) — all new
    this ticket except `markup.ts`/`types.ts`/`presets.ts`/
    `sections.ts`/`gap-key.ts`, already ported by ticket 015
  - `render/{page-script,document,redact,route-section,theme,
    app-icon,curl,mark}.ts` (809 lines, all pure, ported unchanged)
  - `render/pdf.ts` (52, rewritten onto `desktop.pdf`)
  - IPC-layer native dialogs (`src/main/ipc/api-docs.ts`) for
    `exportCollectionDoc`/`chooseDocLogo`/`importCollectionDocDraft`'s
    "choose a different file" path, moved into `src/platform/api-docs.ts`
    the same way ticket 039 already moved `exportPostmanCollection`'s
- Old tests ported: `tests/main/api-studio/{collection-docs,
  doc-draft-watch}.test.ts`
- Public API: the whole `apiDocs` group (12 members) plus
  `onCollectionDocDraftChanged`
- Persistent data touched: `<appFolder("data")>/api-studio-docs.json`
  (`0600`), `<project>/.lazify/api-studio/docs/<collection-slug>/`
  (the brief, job and answer files — not secret, no `0600`)
- Required OS behaviour: none beyond what `desktop.pdf`/`desktop.files`
  and the already-established `execFile("open", …)` pattern need

## What changed in the copy, and why

- **`render/pdf.ts`**: `BrowserWindow` + `webContents.printToPDF` →
  `desktop.pdf.render()` + `desktop.files.read()`/`delete()`. Margins
  convert directly (`theme.ts`'s `PAGE_MARGINS` is already in
  millimetres — Chain's contract wants mm, Electron's wanted inches,
  so the existing `marginInches()` conversion is simply unused here,
  not replaced). The footer's page-number markup
  (`<span class="pageNumber">`) becomes Chain's own placeholder
  syntax (`{page} / {pages}`) — Chain's `footer` option is plain text
  in a margin, not arbitrary HTML.
- **`chooseDocLogo`**: Electron's open-file dialog + a separate
  `fs.readFile` → `desktop.files.pick({ extensions: [...] })`, which
  hands back bytes directly — one capability call instead of two
  steps, since `desktop.files.pick` never exposes a path at all (by
  design, per its own contract) and so needs no follow-up read.
- **`importCollectionDocDraft`'s "choose a different file" path**
  needed the other picker instead: it has to end up with a real file
  *path* (the existing `importCollectionDocDraft(projectPath,
  collectionId, filePath, onlyEmpty)` reads from disk), so
  `desktop.folders.pick({ files: true })` — same picker ticket 033's
  `.app` selection and this phase's other "pick an existing file" uses
  already reach for — not `desktop.files.pick`, which was briefly
  tried first and would have been a dead end (no path to hand onward).
- **`exportCollectionDoc`'s bridge signature carries a `name`, not a
  `filePath`** — same "no save-as dialog" shape as every export
  member ticket 039 already handled, via the same shared
  `exportPathFor()` helper (now exported from `api-studio.ts` for
  this file to reuse rather than copying it a second time).
- **`readAgentDraft`'s missing-file check**: Electron checked
  `fs.existsSync(source)` before reading; the port just lets
  `readTextFile`'s `null`-on-missing (or a parse failure) fall
  through a `.catch(() => null)` at the call site — one check instead
  of two, same outcome (`importCollectionDocDraft` returns `null`
  either way).

## Target boundary

- `src/shared/lib/api-studio/docs/`: `gaps.ts`, `outline.ts` (pure,
  unchanged), `doc-store.ts`, `brief.ts`, `questions.ts`, `job.ts`
  (pure, unchanged), `index.ts`, `draft-watch.ts`, `watch-registry.ts`
  (new).
- `src/shared/lib/api-studio/docs/render/`: all eight pure files
  ported unchanged, `pdf.ts` rewritten.
- `src/platform/pdf.ts` (new): `renderPdf()`, the `desktop.pdf` +
  `desktop.files` wrapper.
- `src/platform/api-docs.ts` (new): all 13 bridge members.
- `src/platform/api-studio.ts`: `exportPathFor` exported for reuse.
- `src/platform/lazify.ts`: the `apiDocs` group and
  `onCollectionDocDraftChanged` move off `rejects`/`noSubscription`.
- `tests/platform/node-folders.ts`: `watch()` added to the shared
  Node-backed `desktop.folders` fake (backed by real `node:fs`
  `watch`), needed by `doc-draft-watch.test.ts` and not present
  before — the same role every other method on that fake already
  plays for its own capability.

## Confirmed real API reference

- `desktop.pdf.render(html, options)` → `{ reference, pageCount,
  size }`; `desktop.files.read(reference)` → bytes;
  `desktop.files.delete(reference)` — all three exercised live for
  the first time in this app, producing a real 3-page PDF.
- `desktop.files.pick({ extensions })` → `{ name, size, bytes }[]`
  (`chooseDocLogo`) — not exercised live (needs the native picker;
  see Open questions), but the non-picker halves of both
  `desktop.pdf` and `desktop.files` now have real evidence.
- `desktop.folders.watch(path, onChange, { recursive })` — already
  wrapped by `watchFolder` (ticket 034 and earlier), now exercised by
  `draft-watch.ts`; confirmed live with a real file write and a real
  change event.

## Execution steps (small commits)

1. `gaps.ts`, `outline.ts` (pure, ported unchanged).
2. `doc-store.ts` (the app-wide store, same shape as every prior
   ticket).
3. `job.ts` (pure), `brief.ts`, `questions.ts`.
4. The eight pure `render/` files, ported unchanged; `src/platform/pdf.ts`
   then `render/pdf.ts` once the margins/footer mapping was decided.
5. `draft-watch.ts` onto `watchFolder`, `watch-registry.ts` for the
   three-way bridge split.
6. `docs/index.ts`, the orchestration layer.
7. `src/platform/api-docs.ts` — `chooseDocLogo`'s picker choice
   corrected once `importCollectionDocDraft`'s own picker need made
   the path/bytes distinction between `desktop.files.pick` and
   `desktop.folders.pick` concrete.
8. Platform wiring, test port (`collection-docs.test.ts`, adding
   `watch()` to the shared Node-backed `desktop.folders` fake first;
   `doc-draft-watch.test.ts`), live verification.

## Acceptance checklist and evidence

- [x] `collection-docs.test.ts` (23 cases) and `doc-draft-watch.test.ts`
      (1) port and pass
- [x] A real collection, scanned for gaps, in the real app: the right
      gaps named, none for what the scan already knew
- [x] A real rendered HTML preview, in the real app: title, sections,
      a curl example, folder grouping all present
- [x] A real PDF export, in the real app: a genuine 3-page PDF file,
      confirmed with `file`
- [x] A real brief written, a real draft watched (a real file write
      producing a real change event with the right collection id), a
      real draft imported, a real unwatch — all in the real app
- [x] `openCollectionDoc` on a real collection, in the real app:
      succeeded (wrote the preview file, opened it)
- [x] The app-wide docs store confirmed `0600` in the real app
- [x] `CI=true npm test` (905 of 914, whole repo), `npm run
      typecheck`, `npm run build:web` all pass

## Not removed

Nothing. Nothing in the Electron repo is changed. This was the last
unported member in both the `api-studio` and `apiDocs` groups.

## Rollback

Revert the commits; the 12 `apiDocs` members and
`onCollectionDocDraftChanged` go back to
`rejects(unported.apiDocs)`/`noSubscription`.

## Open questions

- `chooseDocLogo` and `importCollectionDocDraft`'s "choose a
  different file" path both need a native picker the dev inspector
  can't drive — not yet seen live, left for a person, same as every
  other picker-dependent gap this phase.
- `desktop.pdf.render`'s complex-script caveat (Khmer, Arabic,
  Devanagari, Thai text looks right and selects but copies/searches
  wrong on macOS, per its own contract) wasn't tested — none of this
  ticket's live checks used non-Latin text. Worth knowing if a
  project's API documentation is written in one of those scripts.
- Same as every ticket this phase: the actual Collections/Docs
  screens themselves haven't been clicked through — everything here
  was verified by driving the bridge directly.
- **API Studio as a whole**: every bridge member across all eight
  sub-slices (route inventory, environments, request execution,
  scripts, collections, response files/exports, docs) is now real
  and has characterisation tests plus at least one live check. What
  remains for the feature as a whole, tracked across every ticket in
  this phase rather than repeated here: the screens themselves
  clicked through by a person (needs the native folder picker to open
  a project in the first place), and the handful of
  native-picker-dependent members this ticket and ticket 039 both
  flagged.

## Verification log

- 2026-10-15/16, macOS 27.0.1 arm64: 24 new cases pass. Whole-repo
  `CI=true npm test`: 905 of 914 pass, 9 skipped. `npm run
  typecheck` and `npm run build:web`: clean.
- 2026-10-16, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`): a real collection saved and its doc read back with the
  right gaps; a real HTML preview rendered correctly; a real PDF
  export produced a genuine 3-page PDF (confirmed with `file`); a
  real brief written, watched, answered (a real file write produced a
  real change event naming the right collection), and imported; a
  real `openCollectionDoc` succeeded; the app-wide store confirmed
  `0600`. Scratch files and the `chain dev` process cleaned up
  afterward. Not yet done: the picker-dependent members and the
  actual screens clicked through.
