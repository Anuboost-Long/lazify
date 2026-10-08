# Tickets

One file per change set: `NNN-short-name.md`. Write it **before** coding.

This format merges two things:
- the playbook's migration ticket (roadmap §4: evidence, Not removed, rollback),
- Mneme's feature-doc style (goal, dated status, confirmed API, a
  verification log that grows over time).

So one document carries a slice from proposal to done.
[`001-prompt-assembly-core.md`](001-prompt-assembly-core.md) is a worked
example.

```markdown
# NNN — <capability> (<phase> / <Proposed|In progress|Blocked|Done>)

**Read this whole ticket before touching code.** One-line status.

## Goal
## Status — <date>
What is verified and how. What is still blocked, with links to
`../../chain-sdk-requests/NN-*.md`.

## Source-of-truth references
- Roadmap row:
- Old source / callers:
- Public API (group in 02-contract-manifest.md):
- Old tests / golden fixtures:
- Persistent data touched:
- Required OS behaviour:

## Current observable behaviour
Happy path · failure/cancel path · event sequence and reattachment.

## Target boundary
Core interface and types · old adapter kept via · new adapter / flag ·
permissions and trust boundary.

## Confirmed real API reference
Exact signatures that exist and were exercised. Never guessed ones.

## Execution steps (small commits)
## Acceptance checklist and evidence
## Not removed
## Rollback
## Open questions
## Verification log
Dated entries: what was run, on which OS, with what result.
```

A ticket is done when its row in `../06-parity-matrix.md` is `Pass` or an
approved `Different by design`, with the evidence linked, and the old
implementation can still be recovered.
