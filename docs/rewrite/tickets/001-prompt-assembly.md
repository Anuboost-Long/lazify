# 001 — Prompt assembly (Phase 1 / Done)

**Read this whole ticket before touching code.** Done on 2026-10-09: the
ported code reproduces the Electron app's prompts byte for byte.

## Goal

Port the pure prompt-assembly code from the Electron app into this repo
(A-4: copy, proven by golden fixtures). The Electron app is not changed.
This gives the Chain app the exact prompt text the Electron app produces
for a task, the Prompt Builder preview and "send to agent".

## Status — 2026-10-09

- Ported to `src/features/prompts/lib/` (this repo).
- `tests/features/prompts/prompt-assembly.golden.test.ts` passes against a
  fixture **recorded from the Electron code** at baseline `c9abefc`. 16
  cases: every built-in preset, no preset, a bare task, the default-preset
  fallback, every context line (including an unknown type), and keyword
  preset suggestions.
- Not ported yet: storage for presets and context entries (SQLite), and the
  Prompt Builder screens. Those belong to the Prompt Builder and Tasks
  slices.

## Source-of-truth references

- Roadmap row: Prompt Builder ("deterministic, offline").
- Electron source (unchanged), `src/main/prompts/`:
  - `assemble.ts`, `context-formatter.ts`, `requirement-normalizer.ts`,
    `task-metadata.ts`, `template-renderer.ts`, `preset-suggester.ts`,
    `types.ts`, `builtin-presets/`,
  - the render half of `context-types/*.ts`.
- Electron callers: `prompt-builder.ts` (database shell) and the renderer's
  `features/prompts/hooks/use-prompt-draft.ts` (live preview).
- Electron tests: `tests/main/prompt-builder.test.ts`,
  `tests/main/prompt-presets-and-context.test.ts`.

## What changed in the copy, and why

The copy is byte-identical to the Electron files except for the following:

- **New `context-render.ts`.** The Electron context types mix two things:
  how an entry renders into the prompt, and form metadata (translation-key
  labels, fields) that imports the renderer's generated `translation.ts`.
  Only the rendering is ported here; it is the same `render` bodies and
  `section`s, plus `field`, `sentence` and `bare`. The form metadata comes
  with the Prompt Builder screens.
- `context-formatter.ts` and `types.ts` import from `./context-render`
  instead of `./context-types`.
- An unknown context type renders as a rule, as in Electron. The lookup is a
  `Map`, so a name like `toString` cannot hit an object prototype.

`tsconfig.json`'s `lib` was raised from `ES2020` to `ES2022`.
`template-renderer.ts` uses `Array.prototype.at`, and Vite 8's default build
target (Safari 16.4 and later) already supports it.

## Acceptance checklist and evidence

- [x] Golden fixture recorded from the Electron code, not from the copy:
      `tests/features/prompts/__snapshots__/` is identical to the snapshot
      produced in the Electron repo at `c9abefc`
- [x] `CI=true npm test` passes. With `CI` set, Vitest refuses to write
      snapshots, so the fixture cannot silently update itself
- [x] Mutation check: adding one space to one rendered line fails 12 of the 16 cases
- [x] `npm run typecheck` (app and tests) passes; `vite build` succeeds
- [x] Electron app untouched

## Not removed

Nothing. Nothing in the Electron repo was changed.

## Keeping the two copies in step

Until the Electron app is retired, a change to prompt assembly in either
repo must be made in both. Re-record the fixture from the Electron code, and
check that this repo still matches it.

## Verification log

- 2026-10-09, macOS arm64. In the Electron repo: snapshot recorded by
  `npx vitest run tests/core/prompt-assembly.golden.test.ts`. In this repo:
  `CI=true npx vitest run` gave 16 of 16 passing. The mutation check failed
  12 cases as expected and was reverted.
