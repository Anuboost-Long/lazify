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

## Proposed

### P-2 Branches

- Electron repo: no rewrite branches. `main` keeps shipping.
- This repo: `main` stays runnable. Each ticket gets a short-lived branch,
  `feat/<ticket>-<slice>`, merged by pull request.

### P-3 Data separation

The Chain app uses its own data directory. It imports from a **copy** of the
Electron `<userData>` and never writes to it. Project-local `.lazify/` files
are shared by both apps, so their formats are frozen (see
`03-data-inventory.md` §3).

## Open — owner decisions

| ID | Decision | Blocks |
| --- | --- | --- |
| D-1 | Keep Lazify's React renderer and port it into this repo (recommended), or redesign screens | Phase 4 |
| D-2 | Platforms for the first Chain release. Chain is macOS-only verified, while Lazify ships Windows and Linux. Either cutover waits for Chain's Windows and Linux verification, or the first Chain release is macOS-only | Phase 4 exit, Phase 7 |
| D-3 | Embedded browser: keep it (needs an embedded guest-view capability plus a security review) or leave it out of the first release | Phase 6 browser slice |
| D-4 | First-release scope: auto-update, custom extension install, DMG compiler, which agent CLIs | Phase 5–7 |
| D-5 | Data window: must the Electron app still open a profile after the Chain app has run? (Recommended: yes. The Chain app never writes to the Electron profile) | Phase 3 |
| D-6 | Signing, notarisation and update-feed ownership for Chain builds | Phase 7 |
| D-7 | API Studio secrets: move from plaintext JSON to a keychain capability in the Chain app? | API Studio slice |
