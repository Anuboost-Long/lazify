# Framework Request 26 — `release/` split by architecture, every Mac architecture from one build

Source: the Lazify rewrite to Chain, the owner's ask on 2026-10-23, after
request 25 shipped. A follow-up to 25.

**Not part of this request:**
- Anything request 25 settled: what counts as shipped, `.cached/` holding
  the rest, `release-updates/`.
- Signing, notarization or the update feed's format.

## What happens today

After request 25, every `chain build` empties `release/` and puts that one
build's `.app` and `.dmg` in it. `npm run build:mac`
(`chain build --target universal-apple-darwin`) leaves only the universal
build. If Lazify then builds `aarch64-apple-darwin`, the universal build is
gone. Both builds' `.app` is named `Lazify.app`, so they can't share one
flat folder either.

## What Lazify needs

1. `release/` holds one folder per platform and architecture, and a build
   replaces only its own folder:

   ```
   release/
   ├── macos-arm64/       Lazify.app, Lazify_0.1.0_aarch64.dmg
   ├── macos-x64/         Lazify.app, Lazify_0.1.0_x64.dmg
   └── macos-universal/   Lazify.app, Lazify_0.1.0_universal.dmg
   ```

   On Windows it's the same idea (`windows-x64/`, `windows-arm64/`), and on
   Linux too if Chain covers it. The folder names are Chain's decision. The
   owner chose the layout above.
2. A plain `chain build` (no `--target`) goes into the host architecture's
   folder.
3. Lazify's `npm run build:mac` produces all three Mac folders. The owner
   wants arm64, x64 and universal every time. A universal build already
   compiles both architectures, so the separate ones shouldn't need
   compiling a second time. Whether that's one command (a target that
   means "every Mac architecture") or three `chain build` runs that reuse
   the cache is Chain's decision. Tell Lazify which, and Lazify will change
   its script.
4. The build's closing summary lists every folder and file it wrote.
5. Apps whose `release/` is flat from request 25 move over on the next
   build without anyone deleting anything.

## Platforms

Asked for on macOS (Apple Silicon host). The Windows half is the owner's
ask, not verified here, no Windows machine.

## Suggested next step for chain-sdk

A fixture that builds two targets one after the other and checks both
architecture folders are still in `release/`. Also check that a flat
`release/` from request 25 gets moved into its architecture folder.
