# 09 — Rollback and recovery

What a user (or the owner) does when the Chain app fails them, and what
going back costs. Written 2026-10-17, before the first release.

## Going back to Electron

Always possible, for every slice, because of three rules already in place:
- **The Electron profile is never written** (P-3, D-5). The Chain app reads
  a timestamped copy (`<data>/electron-import/backups/<time>/`, ticket 010)
  and imports from that. `~/Library/Application Support/lazify` is left
  exactly as Electron last saw it.
- **The two apps keep separate data.** Chain's data folder is
  `~/Library/Application Support/<identifier>/app` (`desktop.folders`
  contract), Electron's is `~/Library/Application Support/lazify`.
- **Project folders are shared, in the same formats.** `.lazify/` inside a
  project is read and written in place with Electron's formats
  (`03-data-inventory.md` §3), each pinned by Electron's tests or golden
  fixtures. Electron opens a project the Chain app has used.

To go back, the user opens Electron Lazify. Nothing needs undoing.

**This needs both apps installed side by side** until cutover. Today
that holds: Electron is `Lazify.app` (`com.lazify.desktop`), and the Chain
build is `lazify-chain.app` (`dev.chain.lazify-chain`). See "Before the
first release" in `10-release-readiness.md`: the Chain app's final name and
identifier must keep this true.

## What doesn't come back

Anything done in the Chain app after the import stays there. There is no
export from Chain to Electron. Going back means losing, in Electron:
- tasks, task runs, prompt presets and context added in Chain (SQLite);
- projects added or removed in Chain (the project list);
- app-wide settings changed in Chain: agents, budgets, autopilot, formatter,
  zoom, API Studio's app-side stores (environments' secret values, custom
  collections, allowed hosts, docs), the popup allowlist, the shield
  preference;
- imported templates saved in Chain.

Project-local `.lazify/` changes do carry back (shared, above).

What Electron did meanwhile isn't lost either way: it stays in Electron's
profile. Running the import again in the Chain app picks up
Electron's new records without duplicating old ones (tickets 011–013:
`INSERT OR IGNORE` by id, existing files and keys kept). It doesn't
overwrite a record both apps changed: the Chain copy wins.

## Per slice

| Slice | If it fails in Chain | Data only Chain has |
| --- | --- | --- |
| Import (010–014) | Delete the Chain data folder and import again from the same backup (`08-migration-ledger.md`) | — |
| Projects, workspace, Git (007, 009, 013, 017, 023) | Use Electron | Project list changes; shadow repos (rebuilt by Electron) |
| Scripts, terminals, agents, monitor (004, 005, 008, 018, 019, 032) | Use Electron. Chain stops every process and terminal at quit (process-runner, terminal contracts) | Agent run history in tasks |
| Prompts, tasks (001, 016, 019) | Use Electron | New presets, context, tasks |
| Starters, templates (025, 026) | Use Electron. A half-created project is a normal folder the user can delete | Imported templates saved in Chain |
| Packages, env files, environment, formatting, linting, extensions (021, 022, 024, 027–030) | Use Electron. All write to the project or to tools the user owns, as Electron does | Formatter settings; installed extensions (Chain's own `packages/` folder) |
| API Studio (034–040) | Use Electron; `.lazify/api-studio/` is shared | Secret values, custom collections, allowed hosts, docs |
| DMG compiler (033) | Use Electron | — |
| Browser, PiP, Lazy Shield (042, 043) | Use Electron. Sign-ins don't carry: each app has its own web stores | Browser tabs, history, sign-ins, popup allowlist |
| Updates (request 22) | Download the previous Chain release by hand and install over it; data is kept (it lives outside the app) | — |

## Recovery inside the Chain app

- **The app won't start or shows the fatal-error screen:** the log is
  `<data>/logs/lazify.log` (ticket 031; Settings shows the path). Send
  it with the report. Quitting and reopening reloads the page.
- **A bad import:** run the import again (the `/import` screen; nothing in
  Settings links to it yet, though D-8 asks for it). To start clean,
  quit, delete the Chain data folder, reopen; the first-launch import is
  offered again (D-8).
- **A bad update:** install the previous release by hand (above). The
  updater blocks a downgrade (request 22's feed signature), so this is
  manual by design.
- **Lazy Shield breaks a site:** switch it off from the browser toolbar; the
  choice is remembered.

## Baseline

Any rollback of the code goes to Electron's reference commit `c9abefc`
(`00-baseline.md`). The proposed `legacy/electron-baseline-*` tag is still
not made.
