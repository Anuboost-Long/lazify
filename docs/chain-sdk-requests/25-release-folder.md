# Framework Request 25 — One `release/` folder with only the built app and its installer

Source: the Lazify rewrite to Chain, the owner's ask on 2026-10-23. After a
build, the owner wants to open one folder at the app's root and find the
thing to ship, nothing else.

**Not part of this request:**
- Where Cargo's build cache lives. `.cached/` as the cache, and only the
  cache, is what the owner wants.
- Signing, notarization or the update feed's format.
- Changing what Tauri bundles.

## What happens today

chain-sdk `b3d05fa` copies the shipped files into `released/` after a build
(`collectReleased`, `packages/cli/src/build.ts`). What the owner sees:

1. The folder is named `released/`. The owner wants `release/`.
2. `collectReleased` copies every `.app`/`.dmg`/… found in Tauri's bundle
   folders, and those folders are never emptied between builds. Lazify's
   `.cached/universal-apple-darwin/release/bundle/macos/` still holds
   `lazify-chain.app` from 2026-10-19, before the app was renamed (D-9),
   beside today's `Lazify.app`. The next build would copy both.
3. `released/updates/` sits beside the app when `chain.updates` is set, so
   the folder is not only the app.

## What Lazify needs

1. After `chain build`, the app's root has a `release/` folder holding only
   what this build produced for people to install or run:
   - macOS: the `.app` and the `.dmg`.
   - Windows: the same idea — the installer(s) Tauri builds (`.msi`, the
     setup `.exe`), and the app itself if Chain treats a bare `.exe` as the
     `.app` counterpart. Chain's decision.
   - Linux: likewise, if Chain covers it.
2. Nothing left from an earlier build or an earlier app name ends up in
   `release/`. Only this build's outputs.
3. Everything else a build makes — Cargo's `target`, Tauri's intermediate
   bundle folders, `bundle_dmg.sh`, `icon.icns`, the inspector file — stays
   in `.cached/`.
4. The update feed files don't share the folder with the app. Where they go
   (a sibling folder, a subfolder of `.cached/`, …) is Chain's decision; the
   build's closing summary should say where.
5. Apps already on `released/` move over without the owner deleting
   anything: `chain update` or the next build handles the rename and the
   `.gitignore` line (`/released/` → `/release/`).

## Platforms

Observed on macOS, Apple Silicon, both `chain build` and
`chain build --target universal-apple-darwin`. The Windows half is asked for
by the owner; not verified here, no Windows machine.

## Suggested next step for chain-sdk

A fixture that runs `collectReleased` against a bundle folder holding a
stale `.app` from an earlier name, and checks `release/` holds only the
current build's `.app` and `.dmg`.
