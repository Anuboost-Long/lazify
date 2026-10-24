# Capability Request 29 — Compile only the capabilities an app uses

Source: the Lazify rewrite to Chain, release build time, 2026-10-24.

**Not part of this request:**
- The build cache. It works: a rebuild with nothing changed compiled one
  crate, Lazify's own. The cost below is a build with a cold cache.
- Changing what any capability does at runtime.

## What happens today

`chain build` passes one optional chain-core feature, `chain-core/tts`, and
only when `package.json` sets `"chain.gpl"`. Every other capability is
always compiled and linked into every app.

Lazify calls 20 capabilities (from `desktop.*` in `src/platform/`):
folders, browserView, terminal, updates, http, processRunner, attention,
window, packages, files, agentServer, storage, platform, pageZoom,
keepAwake, ports, pdf.

It never calls audio-recorder, microphone, speech, embeddings, models,
vision or share. Their build cost is still paid on every build:

- `build.rs` downloads and links sherpa-onnx's static libraries (speech and
  models), and compiles the Swift SpeechAnalyzer bridge.
- `symphonia` with ten audio formats and `opus-decoder` (speech).
- `tokenizers` (embeddings).
- objc2 framework bindings for Vision and SFSpeechRecognizer.

A release build with a cold cache compiled 303 crates for the native side.
That happens after a toolchain or chain-core change, on a new machine, in CI,
and once per architecture: `chain build --target macos-all` builds three
(universal, arm64, x64), so every crate is paid for three times. Every build,
warm or cold, also links sherpa-onnx's static libraries into the binary.

## What Lazify needs

- A release build compiles and links only the capabilities the app uses,
  so an app that never records audio or runs a model doesn't build or ship
  that code.
- The set comes from the app: detected from its `@chain/sdk` usage, or
  declared in `package.json` `"chain"`. Either is fine; detection with an
  explicit override would be best.
- Calling a capability the build left out fails clearly (an error naming the
  capability and how to include it), never silently.
- `chain dev` may keep compiling everything if that keeps its shared cache
  simple.

## Acceptance

- `chain build` for Lazify compiles noticeably fewer crates and no longer
  links sherpa-onnx or compiles the Swift speech bridge.
- A clean release build of Lazify is measurably faster, and the `.app` is
  smaller.
- An app that does use speech or models still builds and works with no
  change on its side, or with one line in `package.json`.
