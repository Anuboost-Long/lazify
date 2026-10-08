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
- Lazify never imports Tauri or an OS API directly (`apps/lazify/AGENTS.md`).
- Missing native features are requested with Chain's own workflow
  (`chain-sdk/docs/CAPABILITY_WORKFLOW.md`). Requests live in
  `docs/chain-sdk-requests/` in this repo, using the same format as Mneme's.

### A-2 The Electron app is not deleted

The playbook (§1, §10) applies as written. Electron stays buildable on the
baseline branch, and retirement is a separate, human-approved PR.

### A-3 Repository layout: additive, inside this repo

Accepted 2026-10-09. The owner chose to keep the new app inside this
repository.

```text
lazify/
  src/ …                 Electron app — unchanged, keeps shipping until the rewrite is done
  apps/lazify/           the Chain app, created with `chain init apps/lazify`
  packages/core/         (planned, ticket 001) framework-neutral TypeScript from src/main and src/brain
  docs/rewrite/          this dossier
  docs/chain-sdk-requests/
```

- `apps/lazify` was created on 2026-10-09 by `chain init` from the local
  `chain-sdk` checkout. Its `@chain/sdk`, `@chain/cli` and `chain-core` are
  linked to `../chain-sdk`. Its product name is `lazify` and its bundle
  identifier is `dev.chain.lazify`, so its data directory is separate from
  Electron's `<userData>` (P-3).
- `chain init` always runs `git init` in the folder it creates, even inside
  an existing repository. The resulting empty nested `.git` was removed, so
  the app is tracked as ordinary files in this repo. Worth reporting to
  chain-sdk: init should skip `git init` when it is already inside a work
  tree.
- **Commit `apps/lazify/.chain/baseline/`.** `chain update` three-way merges
  against it. Run `chain update` from `apps/lazify/`, never `chain init`
  again.
- Root tooling is unaffected:
  - root `tsconfig.json`, `tsconfig.node.json` and Vitest only include `src/`
    and `tests/`,
  - electron-builder packages an explicit file list,
  - `npx eslint apps` from the root reported nothing.

  The app has its own `package.json`, `node_modules` and `tsconfig`; the root
  `package.json` (workspaces, lockfile) stays untouched.
- Each app supplies its own adapters to `packages/core` ports: Node for
  Electron, `@chain/sdk` for Chain. Electron uses each extracted module first,
  so the core is proven in the shipping app before Chain depends on it.
  `apps/lazify` will import `packages/core` through tsconfig `paths`.
- `../lazify2`, the older scaffold outside this repo, is no longer used. It
  was left untouched.

## Proposed

### P-2 Branches

- `rewrite/integration`, created from the tagged clean baseline (see
  `00-baseline.md`). It receives reviewed, additive work.
- `rewrite/<phase>-<slice>` branches for each ticket.
- `main` keeps shipping Electron. Product fixes land on `main` and are merged
  into `rewrite/integration`, never the other way.

### P-3 Data separation

The Chain app uses its own data directory. It imports from a **copy** of the
Electron `<userData>` and never writes to it. Project-local `.lazify/` files
are shared by both apps, so their formats are frozen (see
`03-data-inventory.md` §3).

## Open — owner decisions

| ID | Decision | Blocks |
| --- | --- | --- |
| D-1 | Keep Lazify's React renderer and port it into `apps/lazify` (recommended), or redesign screens | Phase 4 |
| D-2 | Platforms for the first Chain release. Chain is macOS-only verified, while Lazify ships Windows and Linux. Either cutover waits for Chain's Windows and Linux verification, or the first Chain release is macOS-only | Phase 4 exit, Phase 7 |
| D-3 | Embedded browser: keep it (needs an embedded guest-view capability plus a security review) or leave it out of the first release | Phase 6 browser slice |
| D-4 | First-release scope: auto-update, custom extension install, DMG compiler, which agent CLIs | Phase 5–7 |
| D-5 | Data window: must the Electron app still open a profile after the Chain app has run? (Recommended: yes. The Chain app never writes to the Electron profile) | Phase 3 |
| D-6 | Signing, notarisation and update-feed ownership for Chain builds | Phase 7 |
| D-7 | API Studio secrets: move from plaintext JSON to a keychain capability in the Chain app? | API Studio slice |
