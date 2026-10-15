# 037 — API Studio: scripts (Phase 6 / Done)

**Read this whole ticket before touching code.** Fourth of the eight
API Studio slices in `05-work-queue.md`: run a route's pre-request and
post-response scripts (Postman-compatible: `lz.*` by default, `pm.*`
when a project asks for it) around a real send. `runApiRequest`,
`readScriptSettings`, `saveScriptSettings` of the 23 `api-studio`
members — the last one deferring a real send to ticket 036's
`sendApiRequest`, finally wired up here.

## Goal

A route's pre-request script can rewrite the request (URL, headers,
body) and read or write environment variables before it goes out; its
post-response script can read the response, write variables back, and
run `lz.test(...)`/`pm.test(...)` checks — with a script that never
returns reported as a clear failure, not a frozen app.

## Status — 2026-10-15

Done, verified live. `runApiRequest`, `readScriptSettings`,
`saveScriptSettings` are real; 13 `api-studio` members still reject.

`CI=true npm test`: 832 of 841 pass, 9 skipped (up from 803 — 29 new
cases: `scripting-sandbox.test.ts` (11), `postman-dialect.test.ts`
(7), `script-settings.test.ts` (6), `run-request.test.ts` (3),
`run-scripted.test.ts` (2)). `npm run typecheck` and `npm run
build:web` pass — the build produces a genuinely separate worker
chunk (`dist/assets/sandbox-worker-*.js`), confirmed by inspecting
`dist/` after the build.

**The real design problem this ticket had to solve**: Electron runs
each script in `node:vm` — a fresh V8 context with an allow-listed
global object and a hard timeout V8 itself enforces, even against an
infinite loop. None of that exists in the webview. The fix is a Web
Worker, not a bigger allow-list:

- `sandbox.ts` still does the actual run — now `new Function(...names,
  source)` instead of `vm.Script(...).runInContext(...)`, called with
  the same allow-listed globals as parameters (shadowing the ambient
  ones inside the function body). This alone has **no timeout** — a
  plain function call cannot be interrupted mid-loop by anything in
  JS.
- So `sandbox.ts` only ever runs **inside a dedicated Worker**
  (`sandbox-worker.ts`), never on the main thread. The worker is a
  separate OS thread: the main thread stays fully responsive while a
  script runs (confirmed live, below), and `worker.terminate()`
  forcibly kills it after 2 seconds — a real interruption, not a
  cooperative one, which actually gives a **stronger** guarantee than
  Electron's `vm` timeout (which still ran on the Node main thread,
  briefly blocking it for the duration).
- Nothing else in the sandbox's pure logic changed: `environment-handle.ts`,
  `request-handle.ts`, `response-handle.ts`, `recorder.ts`,
  `expectations.ts`, `postman-facade.ts`, `pre-request.ts`,
  `post-response.ts` are all unchanged from Electron (only
  `environment-handle.ts` needed its implementation added — ticket
  015 had only ported its types). They all run *inside the worker*
  now instead of inside `node:vm`, which is why they needed no
  changes: they only ever touched the `api` object they were handed,
  never Node or the DOM.
- A Worker's ambient scope has `fetch`, `setTimeout`, `setInterval`
  and friends, which Electron's stripped `vm` context never gave a
  script. Denied explicitly in `sandbox.ts`'s context (shadowed to
  `undefined`), confirmed by the ported
  `"cannot reach the process it runs in"` test, which already
  expected `fetch` unavailable.
- No new chain-sdk capability needed — Workers are a standard web
  platform feature, not something `@chain/sdk` has to provide.

**One real behaviour change this forces**: Electron's `runPreRequest`/
`runPostResponse` were synchronous (because `vm.Script.runInContext`
is). Calling across a Worker boundary is inherently asynchronous, so
`runApiRequest` (and anything that wants the real, timeout-protected
sandbox) now awaits them. The underlying synchronous functions
(`pre-request.ts`/`post-response.ts`) still exist unchanged and are
still directly, synchronously testable — they're just worker-internal
now, not the public path.

Then verified live in `chain dev` through `chain inspect`, against a
real local HTTP server:

- A real `runApiRequest` with both a pre-request script (setting
  `Authorization` from an environment variable) and a post-response
  script (reading the response, setting a variable, running a check):
  the request went out with the header the script set, the check
  passed, `changedValues` carried the new variable.
- A real infinite pre-request script (`for (;;) {}`): the main thread
  answered an unrelated `chain inspect` call *while the loop was
  still running* (proving it wasn't blocked), and after exactly 2
  seconds the call resolved with `"The script did not finish within 2
  seconds."` — not a hang, not a crash.
- `saveScriptSettings`/`readScriptSettings` against a real scratch
  project: saved and read back correctly.

## Source-of-truth references

- Roadmap row: Phase 6, fourth row of the API Studio breakdown in
  `../05-work-queue.md`
- Old source (unchanged), `src/main/api-studio/`:
  - `scripting/{post-response,script-text,postman-facade,pre-request,
    expectations,sandbox,recorder,response-handle,request-handle,
    index}.ts` (460 lines) — `sandbox.ts` rewritten (`node:vm` → `new
    Function` inside a Worker); everything else ported unchanged.
    `environment-handle.ts`'s implementation (ticket 015 had only its
    types) added, 51 lines.
  - `runner/run-request.ts` (56) — deferred from ticket 036, ported
    now that the scripts it calls exist
  - `script-settings.ts` (46)
- Old tests ported: `tests/main/api-studio/{request-scripts,
  postman-dialect,script-settings}.test.ts`, split as described below
- Public API (group in `02-contract-manifest.md`): `runApiRequest`,
  `readScriptSettings`, `saveScriptSettings` only, of the 23-member
  `api-studio` group
- Persistent data touched: `<project>/.lazify/api-studio/scripts.json`
  (the chosen script global name — not a secret, no `0600`)
- Required OS behaviour: none — Workers are a web platform feature

## What changed in the copy, and why

Beyond the Worker architecture above:

- **`run-request.ts`**: Electron's `runPreRequest(...)`/
  `runPostResponse(...)` calls become `await runPreRequest(...)`/
  `await runPostResponse(...)`, importing the async, worker-backed
  versions (`scripting/run-scripted.ts`) rather than the synchronous,
  worker-internal ones (`scripting/pre-request.ts`/`post-response.ts`).
  Everything else in the function — the stop-message, merging
  `changedValues`, calling `sendApiRequest` — is unchanged.
- **`script-settings.ts`**: same treatment as every other project-local
  JSON file this phase (`node:fs` → `@/platform/folders`, synchronous
  → async). No secret involved, so no `restrictToOwner`.

## Target boundary

- `src/shared/lib/api-studio/scripting/`: `sandbox.ts` (rewritten),
  `pre-request.ts`, `post-response.ts` (ported, worker-internal only),
  `script-text.ts`, `expectations.ts`, `recorder.ts`,
  `request-handle.ts`, `response-handle.ts`, `postman-facade.ts`
  (ported unchanged), `environment-handle.ts` (implementation added).
- `src/shared/lib/api-studio/scripting/sandbox-worker.ts` (new): the
  Worker entry point — `self.onmessage` dispatches to `pre-request.ts`/
  `post-response.ts`, posts the result back.
- `src/shared/lib/api-studio/scripting/run-scripted.ts` (new): the
  public, async `runPreRequest`/`runPostResponse` — spins up a fresh
  `Worker` per call (`new Worker(new URL("./sandbox-worker.ts",
  import.meta.url), { type: "module" })`, Vite's native worker-import
  syntax), races a 2-second timeout against the reply, terminates the
  worker either way.
- `src/shared/lib/api-studio/runner/run-request.ts` (new): `runApiRequest`,
  using the async versions above.
- `src/shared/lib/api-studio/script-settings.ts`: implementation
  added onto the existing type-only stub.
- `src/platform/api-studio.ts`, `lazify.ts`: the three members move
  off `rejects(unported.apiStudio)`.

## Confirmed real API reference

No new chain-sdk capability. `new Worker(new URL(..., import.meta.url),
{ type: "module" })` is Vite's own documented worker-import syntax,
confirmed to produce a separate build chunk and to run correctly in
the real Chain webview (both verified above) — nothing to do with
`@chain/sdk`.

## Execution steps (small commits)

1. The pure, unchanged scripting modules (`script-text.ts` through
   `postman-facade.ts`, `environment-handle.ts`'s implementation).
2. `sandbox.ts` rewritten onto `new Function`, deliberately with no
   timeout of its own — the next step is what makes that safe.
3. `pre-request.ts`, `post-response.ts` ported unchanged (worker-internal).
4. `sandbox-worker.ts`, then `run-scripted.ts` — the Worker boundary
   and its timeout race.
5. `runner/run-request.ts` (the deferred `runApiRequest`), `script-settings.ts`.
6. Platform wiring, then live verification — including the
   main-thread-stays-responsive and the real-interruption checks,
   which only mean something against the real app, not a test double.

## Acceptance checklist and evidence

- [x] `scripting-sandbox.test.ts` (11 cases, the non-timeout parts of
      Electron's `request-scripts.test.ts`) and `postman-dialect.test.ts`
      (7) port and pass unchanged against the synchronous,
      worker-internal `pre-request.ts`/`post-response.ts`
- [x] `script-settings.test.ts` (6) ports and passes unchanged
- [x] `run-request.test.ts` (3, the `runApiRequest`-level cases from
      Electron's suite) pass against a real local HTTP server, with
      the worker transport swapped for a direct call to the same
      synchronous sandbox a worker would run (`Worker` doesn't exist
      under Node/Vitest — see Open questions)
- [x] `run-scripted.test.ts` (2, new) proves the timeout-and-fallback
      logic itself, against a fake `Worker` that never replies plus
      fake timers
- [x] A real pre+post-request script pair, sent for real, in the real
      app: header set by the script present on the wire, post-response
      check passed, changed values carried through
- [x] A real infinite pre-request script, in the real app: the main
      thread answered another call while it ran; after 2 seconds the
      call resolved with the timeout message, not a hang
- [x] `readScriptSettings`/`saveScriptSettings` against a real scratch
      project, in the real app: saved and read back correctly
- [x] `CI=true npm test` (832 of 841, whole repo), `npm run
      typecheck`, `npm run build:web` all pass; `dist/` contains a
      separate `sandbox-worker-*.js` chunk

## Not removed

Nothing. Nothing in the Electron repo is changed. The other 13
`api-studio` members stay rejecting.

## Rollback

Revert the commits; the three members go back to
`rejects(unported.apiStudio)`.

## Open questions

- `Worker` does not exist under Node, so nothing in this test suite
  drives a real worker thread — `run-request.test.ts` substitutes a
  direct call to the same synchronous sandbox a worker would run
  (transparent: it's the identical code, just not crossing a real
  thread boundary), and `run-scripted.test.ts` tests the
  timeout-and-fallback logic against a fake `Worker`. The real
  worker round-trip, the real OS-thread interruption of a genuine
  infinite loop, and the main thread staying responsive while it
  happens are only verified live (above) — intentionally, since
  that's the one thing no Node-based test double can actually prove.
- A worker is spun up fresh per script call rather than reused across
  a session. Simpler and leak-proof (no state or timers surviving
  between runs), at the cost of a fresh worker's startup time on every
  pre- and post-request script — not measured separately from the
  rest of a request's `durationMs` in the live checks above, and not
  expected to matter for how often a single request's scripts run,
  but worth knowing if a future ticket profiles request latency.
- `postman-facade.ts`'s Postman compatibility is deliberately partial
  (no chai-style `.to.be.a(...)`, confirmed by a ported test) — this
  is Electron's own documented scope, not something this ticket
  narrowed further.

## Verification log

- 2026-10-15, macOS 27.0.1 arm64: 29 new characterisation/unit cases
  pass. Whole-repo `CI=true npm test`: 832 of 841 pass, 9 skipped.
  `npm run typecheck`: clean. `npm run build:web`: clean, and
  `dist/assets/sandbox-worker-*.js` confirmed present as its own
  chunk.
- 2026-10-15, macOS 27.0.1 arm64, real app (`chain dev` + `chain
  inspect`), against a real local HTTP server: a pre+post-request
  script pair sent a real request with the script-set header,
  correctly ran its check, and carried its changed value back; a
  real `for (;;) {}` pre-request script was genuinely interrupted
  after 2 seconds (main thread answered an unrelated call while the
  loop was still running, proving it wasn't blocked); script settings
  saved and read back correctly against a real scratch project.
  Server, scratch folder and the `chain dev` process cleaned up
  afterward. Not yet done: the actual Scripts panel screen clicked
  through (same gap as every ticket this phase).
