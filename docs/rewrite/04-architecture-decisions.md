# 04 — Architecture decisions

**Status values:** `Accepted`, `Proposed` (awaiting owner approval) and
`Open` (an owner decision is needed before the dependent phase starts).

## Accepted

### A-1 Target framework: Chain SDK

The replacement shell is Chain (`../chain-sdk`). It has three layers:
- a React + TypeScript webview that calls only `@chain/sdk`,
- Chain Core in Rust,
- Tauri as today's runtime.

Consequences:
- **No Node runtime.** Everything in `src/main` that uses `fs`,
  `child_process`, `node-pty` or `node:sqlite` is rewritten as app-level
  TypeScript over Chain capabilities, or becomes a capability request.
- Lazify never imports Tauri or an OS API directly (`../../AGENTS.md`).
- Missing native features are requested with Chain's own workflow
  (`chain-sdk/docs/CAPABILITY_WORKFLOW.md`). Requests live in this repo's
  `docs/chain-sdk-requests/`, using the same format as Mneme's.

### A-2 The Electron app is not deleted

The playbook (§1, §10) applies as written. Electron stays buildable on the
baseline branch, and retirement is a separate, human-approved PR.

### A-3 Two repositories: the Electron app stays as it is

Accepted 2026-10-09 by the owner.

```text
~/Work/
  lazify/          Electron app. Untouched by the rewrite; keeps shipping until parity
  lazify-chain/    this repo: the Chain app, created with `chain init lazify-chain`
    docs/rewrite/             this dossier
    docs/chain-sdk-requests/  requests to chain-sdk
  chain-sdk/       the framework; lazify-chain links to it
```

- `lazify-chain` was created on 2026-10-09 by `chain init` from the local
  `chain-sdk` checkout. Its `@chain/sdk`, `@chain/cli` and `chain-core` are
  linked to `../chain-sdk`. Its bundle identifier is `dev.chain.lazify-chain`,
  so its data directory is separate from Electron's `<userData>` (P-3).
- **Commit `.chain/baseline/`.** `chain update` three-way merges against it.
  Run `chain update` from this repo's root, never `chain init` again.
- Source layout follows Mneme and the Electron renderer (`../../AGENTS.md`):
  route husks in `src/routes`, screens in `src/features/<feature>/pages`,
  and `src/platform` as the only caller of `@chain/sdk`.
- Paths in this dossier such as `src/main/…`, `src/preload/…` and `tests/…`
  refer to the **Electron repo** (`../lazify`) unless they say otherwise.
- Earlier the same day, the app was briefly scaffolded inside the Electron
  repo (`apps/lazify`). That was undone. The Electron repo's
  `rewrite/integration` branch still holds those commits on the remote; it
  is unused and was not deleted.
- `chain init` always runs `git init`, even inside an existing repository.
  Worth reporting to chain-sdk.
- **Amended 2026-10-09 by the owner:** on GitHub, this repo is not its own
  repository. Its history is pushed to the `lazify-chain` branch of the
  Electron repo (`Anuboost-Long/lazify`), with no shared history with
  Electron's `main`. Locally the two stay separate folders as above (P-2).

### A-4 Shared logic is copied, with parity proven by golden fixtures

Accepted 2026-10-09 by the owner. The Electron app is not refactored to share
code. Pure modules (prompt assembly, route scanners, template engine, package
matching, and so on) are **copied** into this repo under their feature's
`lib/`. Each copy is pinned by a golden fixture: the exact output the
Electron code produces for fixed inputs, recorded from the Electron repo at
the baseline commit. The copy must reproduce it byte for byte. A deliberate
change to behaviour updates the fixture and is listed as "Different by
design" in `06-parity-matrix.md`.

Trade-off accepted: two implementations exist until the Electron app is
retired. A fix made to one during that time must be made to the other too.

### P-2 Branches

Accepted 2026-10-09 by the owner, amended the same day to one branch.

- Electron repo: its own branches are untouched and `main` keeps shipping.
  The one rewrite branch there is `lazify-chain`.
- This repo: `main` tracks `origin/lazify-chain`, and work is committed
  straight to it. There are no per-ticket branches or pull requests.
  `main` stays runnable: every commit passes `CI=true npm test` and
  `npm run typecheck`.

### P-3 Data separation

Accepted 2026-10-09 by the owner.

The Chain app uses its own data directory. It imports from a **copy** of the
Electron `<userData>` and never writes to it. Project-local `.lazify/` files
are shared by both apps, so their formats are frozen (see
`03-data-inventory.md` §3).

### D-1 Port the renderer, then redesign

Decided 2026-10-09 by the owner. Lazify's React renderer is ported into this
repo as it is, to reach parity. Screens are redesigned one at a time after
cutover, each as its own ticket with its own parity evidence.

### D-2 The first Chain release is macOS-only

Decided 2026-10-09 by the owner. Windows and Linux users stay on the Electron
app until Chain is verified on those platforms. Until then both apps ship.

### D-5 The Electron app can always open its profile

Decided 2026-10-09 by the owner. Following from P-3, the Electron profile is
never written by the Chain app, so a user can go back to Electron at any time.

### D-8 Import offered on first launch

Decided 2026-10-09 by the owner. On first run, the Chain app finds the
Electron profile, backs up a copy, and offers to import it. It shows what it
found and imports only after the user confirms. Projects whose folders can't
be found are listed for the user to fix. The import is also available later
from Settings. See `08-migration-ledger.md`.

## Open — owner decisions

| ID | Decision | Blocks |
| --- | --- | --- |
| D-3 | Embedded browser: keep it (needs an embedded guest-view capability plus a security review) or leave it out of the first release | Phase 6 browser slice |
| D-4 | First-release scope: auto-update, custom extension install, DMG compiler, which agent CLIs | Phase 5–7 |
| D-6 | Signing, notarisation and update-feed ownership for Chain builds | Phase 7 |
| D-7 | API Studio secrets: move from plaintext JSON to a keychain capability in the Chain app? | API Studio slice |
