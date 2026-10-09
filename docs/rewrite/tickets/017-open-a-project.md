# 017 — Open a project (Phase 4 / Done; the picker with a person pending)

**Read this whole ticket before touching code.** In the ported Workspace, a
project can be synced, listed, opened, browsed, previewed, searched and
removed, all through `src/platform/` on Chain.

## Status — 2026-10-09

- Everything "open a project" needs was already in the bridge from tickets
  005, 007, 009 and 015: `selectDirectory`/`selectDirectories`,
  `importProjectIndexFromDirectory`, `readImportedProjectFile`,
  `readProjectAssetFile`, `searchProject`, `getProjectGitStatus` and the
  Git actions. No renderer code changed.
- `matchPackageVersions` is now wired too (`src/platform/packages.ts`, the
  ticket 003 matcher with `projectReader` and `registryFetch`).
- Workspace panes still on stubs are other slices: packages
  (`listProjectPackages`, `installPackage`, …), extensions, formatting,
  linting and Sonar, templates, picture-in-picture, NVM. They say "not
  available yet" when used.

## Acceptance checklist and evidence

- [x] Real app, through the Workspace's own buttons (`chain inspect`
      clicking them): **Sync project** (with `selectDirectories` replaced
      for the test by one returning this repository) synced lazify-chain as
      Vite with npm; **Open lazify-chain** opened
      `#/workspace/project//Users/anuboost/Work/lazify-chain`; the tree
      showed `AGENTS.md`, `package.json`, `src`, `docs`; clicking
      `AGENTS.md` previewed it; the Git pane showed the branch;
      Cmd+Shift+F and a query gave "6 results in 3 files" in about 300 ms;
      **Remove lazify-chain** removed it, leaving the existing "lazify"
      entry
- [x] `searchProject` called directly: 247 ms, 3 files (2.5 s before ticket
      009's folder snapshot)
- [ ] The folder picker itself, with a person choosing a folder
- [ ] A project the user granted through the picker (read-write), rather
      than one of `chain dev`'s declared read-only folders
