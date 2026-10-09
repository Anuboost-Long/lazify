# Capability Request 10 — Declare single read-only files

Source: the Lazify rewrite to Chain, Phase 4 ticket 019 (agent usage).
Row: AI agents ("usage, budget/rate-limit ... match").

**Not part of this request:**
- Writing to these files.
- Any runtime way to add a declared path.

## Why this needs a change

`chain.readOnlyFolders` is documented for folders. Lazify's agent usage
panel needs two single files from the user's home, and declaring their
parent folders would grant far more than it needs:

- `~/.claude.json`: Claude Code's config. Lazify reads only
  `cachedUsageUtilization`, the offline fallback for the 5-hour and 7-day
  percentages. Its parent is the whole home folder.
- `~/.codex/auth.json`: Codex's ChatGPT token, sent only to
  `chatgpt.com/backend-api/wham/usage`, exactly as Codex itself does. Its
  parent, `~/.codex`, also holds Codex's config, logs and history.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/agents/claude-usage-api.ts` reads `~/.claude.json` when the
account can't be reached. `src/main/agents/codex-usage-api.ts` reads
`~/.codex/auth.json` before every live rate-limit request. Both read only;
neither writes.

## What Lazify needs

- An entry in `chain.readOnlyFolders` (or a sibling list) may name a
  **file**, granting read-only access to that file and nothing else.
- `grants()` reports it with `kind: "file"`.
- A declared file that doesn't exist yet fails `NOT_FOUND`, like a
  declared folder.

From reading `crates/core/src/folders.rs`, a declared file path may already
work for `readText` (the root check is a path-prefix match), but
`grants()` reports it as a folder and the contract doesn't promise it.
Lazify has declared both files and will rely on this once it is
documented.

## Platforms

macOS first (D-2).

## Suggested next step for chain-sdk

Confirm or adjust the behaviour, document it in the folders contract, and
add a test with a declared file. Lazify then checks the usage panel in
`chain dev` with a signed-in Codex.
