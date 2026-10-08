# 015 — Renderer foundation (Phase 4 / Done in build and tests, app run pending)

**Read this whole ticket before touching code.** The Electron app's whole
React renderer is ported into this repo (D-1: port as it is, redesign
later), compiles, and talks to Chain through one bridge object.

## What was done

- **Copied** Electron's `src/renderer` (645 files) folder for folder:
  `app/` → `src/app/`, `app/routes/` → `src/routes/`, `features/`,
  `shared/`, `i18n/`, `assets/`, `styles.css`, `main.tsx`,
  `vite-env.d.ts`. The scaffold's placeholder Home and About pages,
  `App.tsx`, `App.css`, data router, `RootLayout` and `NavBar` were
  removed.
- **Tailwind 3 → 4** with Tailwind's official upgrade tool, run on a
  scratch copy of the renderer (239 files of class renames such as
  `!text-x` → `text-x!`, `bg-text/[0.08]` → `bg-text/8`; the JS config
  became an `@theme` block). The tool left circular variables
  (`--color-bg: rgb(var(--color-bg))`), because Tailwind 4 names theme
  colours `--color-*`, the same as Lazify's raw `r g b` values. The raw
  values were renamed `--lz-*` (and `--lz-font-display`) everywhere.
- **React 18 → 19** adjustments, four lines: `React.JSX.Element`,
  `useRef(undefined)`, `inert={true}`, a `RefObject<T | null>`.
- **Imports:** `@renderer/` → `@/`. `@main/…` imports point at the ported
  module (`@/features/prompts/lib`, `@/shared/lib/agents`, `@/shared/lib/git`,
  `@/platform/command-runner`, …) or at a copy under `src/shared/lib/` with
  Electron's path. Files that only hold types are copied verbatim; types
  declared inside Node modules are extracted into types-only stand-ins
  until that module is ported with its feature.
- **Prompt assembly** now imports Electron's own `context-types` (copied,
  translation import adjusted), and `context-render.ts` from ticket 001 is
  gone: it only existed because the translation file wasn't here yet. All
  seven prompt-assembly files are byte-identical to Electron's again, and
  ticket 001's golden fixture still passes.
- **Bridge:** `src/platform/lazify-api.ts` is generated from Electron's
  preload source (217 members, exact signatures).
  `src/platform/lazify.ts` implements it and is installed as
  `globalThis.lazify` in `main.tsx`:
  - 45 members map to `src/platform/` (scripts, Git, projects, commands,
    agents, folder pickers, opening URLs and Finder), all type-checked
    against Electron's signatures;
  - the other 172 reject with "<name> isn't available in Lazify Chain yet"
    (subscriptions return a no-op unsubscribe), so a screen whose group
    isn't ported fails visibly rather than crashing the app.
- `src/platform/system.ts`: links, Finder and Terminal through macOS's
  `open` via `process-runner` (`http`, `https` and `mailto` only for
  links), until Chain has an "open with the default app" primitive.
- New packages at Electron's versions: `react-i18next`, `i18next`, `jotai`,
  `iconoir-react`, `@xterm/xterm`, `@xterm/addon-fit`, `shiki`, and the
  Manrope and Chakra Petch fonts.
- The import screen (ticket 014) uses Lazify's tokens and is routed at
  `/import` inside `AppShell`, which runs the first-launch check.
- Tools that regenerate the bridge type: `docs/rewrite/scripts/renderer-port/`.

## Known Electron behaviour carried over

A few gradients use a raw triplet as a colour
(`linear-gradient(…, var(--color-accent), …)`), which isn't valid CSS, so
those highlights don't render in Electron either.

## Not done yet

- The import screen's text isn't translated (Khmer, Chinese).
- Electron's renderer tests (`tests/renderer`) aren't ported yet; each
  slice brings its own.
- The app hasn't been looked at running: that needs `chain dev` restarted
  (see ticket 009's note).

## Acceptance checklist and evidence

- [x] `npm run typecheck` passes (from 363 errors after the copy)
- [x] `CI=true npm test` passes (261 tests), including ticket 001's golden
      fixture through `context-types`
- [x] `vite build` succeeds
- [ ] The app opens on Home in `chain dev`, and the sidebar's pages render
