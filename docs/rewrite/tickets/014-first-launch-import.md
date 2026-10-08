# 014 — First-launch import flow (Phase 3 / Built, waits on the owner's first run)

**Read this whole ticket before touching code.** On first launch, the Chain app
offers to import the Electron app's data (D-8), runs tickets 010–013 when
the user confirms, and lists the user's projects with what each needs.

## Status — 2026-10-09

- `src/shared/lib/migration/electron-import.ts`:
  - `offerElectronImport()`: the inspection report plus the stored project
    list, read straight from the profile (read-only), with nothing copied.
  - `runElectronImport(localStorage)`: backup (010), database (011), files
    (012), `localStorage` items (013), then each project checked on disk
    (`test -e` through `process-runner`, since `desktop.folders` can't look
    outside a grant). Always records an `electron_imports` entry, even for a
    profile without a database.
  - `hasImportedBefore()`.
- `src/features/migration/hooks/useFirstLaunchImport.ts`, used by
  `RootLayout`: on launch, opens `/import` when an Electron profile exists,
  nothing has been imported, and the user hasn't chosen "Not now"
  (`lazify-chain-import-dismissed`). `/import` stays reachable.
- `src/features/migration/hooks/useElectronImport.ts` and
  `pages/ImportPage.tsx`, routed by `src/routes/ImportRoute.tsx`:
  1. **Import your Lazify data**: what was found (projects, prompt presets,
     context entries, tasks, custom agents, imported templates), warnings,
     **Import** and **Not now**.
  2. **Imported**: where the backup is, then **Your projects**, each with
     "Access allowed", "Needs access" or "Not found at this path", and
     **Choose project folders** (the folder picker, several at once). Chain
     only opens folders the user grants, so each project is picked once.
  3. A failure says what went wrong, that the desktop app wasn't changed,
     and offers **Try again**.

## Design notes

The app is still the `chain init` scaffold, so the screen uses its theme
tokens with restraint: one column, grouped lists with dividers instead of
cards, lime only on the main action, visible focus outlines, no motion.
It will be restyled with the rest of the UI when Lazify's renderer is
ported (Phase 4, D-1).

## Not done

- Moved projects: a project "Not found at this path" can't be pointed at its
  new folder yet. The remapping flow comes with the projects screens.
- API Studio secrets stay in the backup until D-7.

## Acceptance checklist and evidence

- [x] Tests (`tests/shared/lib/migration/electron-import.test.ts`): no
      profile, no offer; the offer lists what was found and the projects
      without copying anything; a full run backs up and imports database,
      files and settings and checks each project; a profile without a
      database is still recorded; a second run keeps Chain-side settings
      and adds no rows
- [x] `CI=true npm test` passes (261 tests); typecheck and build pass
- [ ] The owner's first run on the real profile, after `chain dev`
      restarts: the screen opens on its own, the counts match ticket 010's
      shell reading, Import succeeds, and projects can be granted
