# lazify-chain — Agent Memory

This is the Chain SDK rewrite of Lazify. The Electron app in `../lazify`
stays untouched and keeps shipping until this app reaches parity. Treat it
as the reference to compare against, not as code to edit from here.

lazify-chain consumes the Chain SDK (`@chain/sdk`) from the sibling `chain-sdk`
repo. It must never import Tauri, Rust, or any native/OS API directly —
only `@chain/sdk`. See that repo's `AGENTS.md` and `docs/ARCHITECTURE.md`
for the rules this app has to follow, and
`agent-docs/capabilities/<name>/CONTRACT.md` for what each capability
actually does.

## Current state

This is the scaffold produced by `chain init`:

- Tauri + React + TypeScript (via `create-tauri-app`) — a real native
  runtime, not just a browser page. `npm run dev`/`npm run build` run
  `chain dev`/`chain build`, which wrap the real `tauri dev`/`tauri build`
  behind condensed output — this was deliberately changed from
  `create-tauri-app`'s default, where those names only ran Vite. Use
  `npm run dev:web`/`npm run build:web` for frontend-only iteration. If
  you ever rename `dev:web`/`build:web`, update
  `.chain/native/tauri.conf.json`'s `beforeDevCommand`/`beforeBuildCommand`
  to match, or `npm run dev`/`npm run build` will recurse into
  themselves infinitely.
- The Tauri native project (Rust/Cargo side) lives at `.chain/native/`,
  not the usual `src-tauri/` — dot-prefixed and hidden on purpose, since
  it's generated/framework-owned the same way `node_modules` is, and you
  should almost never need to open it (the real native logic lives in
  `chain-sdk`'s `crates/core`). `chain dev`/`chain build` point Tauri at
  it via the `TAURI_APP_PATH` env var, so running `tauri dev`/`tauri
  build` directly (instead of through `chain`) won't find it.
- Tailwind CSS v4, wired through `@tailwindcss/vite` in `vite.config.ts`.
  `src/App.css` defines the `chain-navy`/`chain-lime`/`chain-cream` theme
  tokens (matched to `asset/app-icon.svg`) via a Tailwind `@theme` block —
  use them as plain classes (`bg-chain-navy`, `text-chain-lime`, ...),
  don't reach for arbitrary-value brackets or a different palette without
  a reason. Add custom CSS there only when a utility class genuinely
  can't express it.
- Imports from another folder start at `src/` with `@/`
  (`@/features/home/pages/HomePage`); imports in the same folder stay `./`.
  The alias is set in `tsconfig.json` (`paths`) and `vite.config.ts`
  (`resolve.alias`), and both must agree.
- Routing via `react-router-dom`'s data router, split into husks and
  content. This is the same layering as Mneme and as the Electron Lazify
  renderer (`../lazify/src/renderer`), so ported screens move across
  folder for folder:
  - `src/router.tsx` — `createBrowserRouter` route tree. Add new
    top-level routes here as siblings; nest under a parent route only when
    routes genuinely share layout beyond `RootLayout`.
  - `src/routes/` — one husk per route (`HomeRoute.tsx`). A route owns
    the wiring only (`useParams`, data loading, app-wide state) and renders
    nothing but its feature's page.
  - `src/features/<feature>/pages/` — the actual UI, receiving data and
    callbacks as props. `components/`, `hooks/` and `lib/` beside it hold
    what only that feature uses.
  - `src/shared/ui/`, `src/shared/lib/`, `src/shared/providers/` — pieces
    used by more than one feature.
  - `src/platform/` — the **only** code that calls `@chain/sdk`. Each file
    wraps one capability (filesystem, processes, terminals, storage) behind
    an app-shaped function. Features never import `@chain/sdk` directly,
    so a capability change touches one file. (The scaffold's home page
    still calls `desktop.platform` directly; it is a placeholder.)
  - `src/app/` — the app shell's own pieces (`NavBar`), used only by
    `src/layouts/RootLayout.tsx`.
  - `src/layouts/RootLayout.tsx` — shared chrome (`NavBar` + `<Outlet/>`).
  - Porting map from Electron Lazify: `src/renderer/features/X` →
    `src/features/X`, `src/renderer/shared` → `src/shared`,
    `src/renderer/app/routes` → `src/routes`, the `@renderer/` alias → `@/`.
    Anything that called `window.lazify.*` goes through `src/platform/`
    instead.
  - `src/App.tsx` just renders `<RouterProvider router={router} />`;
    `src/main.tsx` is untouched from `create-tauri-app`'s default.
    This is standard in-window SPA routing, not Tauri's multi-window API —
    multiple native windows are a different pattern (separate OS-level
    windows, not in-page navigation) and would be a deliberate later choice
    if this app ever needs genuinely separate windows, not a default.
- `src/features/home/pages/HomePage.tsx` calls `desktop.platform.getInfo()` to prove the
  app can reach the Chain SDK end to end.
- Chain's placeholder branding: `asset/app-icon.svg` (used in the nav
  bar) and `asset/icons/` (the full desktop icon set), also copied into
  `.chain/native/icons/` where Tauri's bundler actually reads them from
  (`.chain/native/tauri.conf.json`'s `bundle.icon` already points there —
  no config change needed to use them).

## Feature development workflow

When implementing application features:

1. Start from the application's roadmap or requirement.
2. Create or update `docs/features/<feature>.md` before substantial implementation.
3. Record the feature's intended behaviour, relevant source locations,
   dependencies and acceptance criteria.
4. Use only `@chain/sdk` for native/platform functionality.
5. If a required Chain capability does not exist:
   - create `docs/chain-sdk-requests/<request>.md`;
   - describe what the application needs, not how Chain should implement it;
   - hand the request to the Chain SDK maintainers;
   - do not bypass Chain with Tauri, Rust or OS APIs.
6. After Chain provides the capability, complete the application feature.
7. Update the feature document with what actually shipped and which Chain
   capability/request it depends on.

## Staying in sync with chain-sdk

Run `chain update` from this app's root any time chain-sdk's templates
change. It does a real three-way merge (like git), not a reset — files
you haven't touched pick up the new template silently; files you've
edited merge cleanly if the changes don't overlap, or get real `<<<<<<< /
======= / >>>>>>>` conflict markers if they do (resolve those before
`npm install` or building). `.chain/baseline/` is the merge ancestor this
depends on — **commit it to git, don't delete or gitignore it**.

## Replacing the icon

1. Replace `asset/app-icon.svg` with your own square SVG.
2. Regenerate the desktop set: `npx tauri icon asset/app-icon.svg --output asset/icons`
   (run from this app's root, after installing the Tauri CLI).
3. Copy the regenerated files from `asset/icons/` into `.chain/native/icons/`
   — that's the copy Tauri's bundler actually uses.

## Next steps

- [ ] Replace `Home`/`About` with real screens — this scaffold's pages
      are placeholders, not a design to keep.
- [ ] Do not add capabilities here speculatively. A capability only gets
      built in `chain-sdk` when this app has a real requirement for it
      (see `chain-sdk/AGENTS.md` rule 7).
- [ ] If this app ever needs genuinely separate OS windows (not just
      in-page routes), that's a Tauri multi-window decision to make
      deliberately — don't reach for it by default.
