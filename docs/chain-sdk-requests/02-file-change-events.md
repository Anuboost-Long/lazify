# Capability Request 02 — Tell the app when files in a folder change

Source: the Lazify rewrite to Chain (`docs/rewrite/01-capability-inventory.md`).
The rows are API documentation and AI agents. It depends on request 01
(which folders the app may access).

**Not part of this request:**
- Reading the changed files (request 01).
- Deciding what a change means: Lazify debounces, filters and reacts at app
  level.

**Priority, stated plainly:** lower than 01, 03 and 04. Today's Electron app
watches only two places, listed below. The project tree is re-indexed on
demand, not live. So this is not blocking the first vertical slice. It is
numbered 02 because it belongs to the same folder-access design and is
cheapest to decide alongside 01.

## Why this needs a new capability

There is no watching in any Chain capability today. A webview cannot watch
the filesystem, and polling folders over IPC would cost far more than the OS
change notifications Chain's own rules prefer ("events over polling").

## What Lazify actually does with this today (Electron, verified in source)

| Watcher | Code | What is watched | Behaviour |
| --- | --- | --- | --- |
| API docs draft | `src/main/api-studio/docs/draft-watch.ts` | One folder, `<project>/.lazify/api-studio/docs/…`, non-recursive | Filters to one file name, settles for `SETTLE_MS`, then re-imports the draft an agent wrote |
| Agent activity | `src/main/agents/agent-activity-watcher.ts` | `~/.claude/projects` and `~/.codex/sessions`, **recursive** | Filters to `*.jsonl`, settles per agent, rate-limits, then refreshes usage numbers |

Both use Node's `fs.watch` and return a disposer. Both tolerate the folder not
existing; for an agent that has never run, the watcher is simply skipped.

## What Lazify needs

The contract shape is Chain's decision. At minimum:

- Watch a folder, recursive or not. The events carry the changed path, plus
  a kind if the OS reports one. Lazify treats a missing kind as "something
  changed".
- **Disposable.** Each watch returns a handle whose `stop()` releases the OS
  watcher. Lazify unmounts screens often, and the roadmap requires no
  duplicate listeners after navigation.
- Coalescing native bursts is welcome but not required. Lazify keeps its own
  settle timers.
- A watch on a folder that does not exist yet should fail clearly (so Lazify
  can skip it, as today) rather than silently never firing.
- Scope follows request 01's grants. The agent transcript folders are outside
  any project, so they need the read-only allow-list described in request
  01's "Design fork".

## Native module survey — macOS vs Windows

### macOS
FSEvents. It is recursive by nature and reports at directory granularity
unless file-level events are requested. Events can arrive batched and late
(the latency setting), which is fine for both Lazify uses.

### Windows (not verified)
`ReadDirectoryChangesW`. Its buffer can overflow under heavy churn (a `git
checkout` or `npm install` inside a watched tree). The overflow should
surface as a "rescan needed" event rather than silently losing changes.

### Shared
The Rust `notify` crate wraps both platforms. This probably needs no Swift or
.NET code.

## Suggested next step for chain-sdk

Decide alongside request 01's grant model. Then draft `CONTRACT.md` with
non-goals: no content diffing, no glob filtering (the app filters), and no
persistence of watches across restarts.
