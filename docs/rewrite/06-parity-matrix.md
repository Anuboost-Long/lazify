# 06 — Old-versus-new parity matrix

The release gate. The rows and rules are the roadmap's "Old-versus-new rebuild
comparison checklist"; read the exact behaviour to compare there. Fill in
**Old evidence** and **New evidence** with links (fixture IDs, test runs,
recordings in `evidence/`).

Results: `Not started` · `Different by design (approved)` · `Pass` · `Blocker`.
An untested OS is `Not tested`, never `Pass`.

| Area | Old evidence | New evidence | macOS | Windows | Linux | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Launch and recovery | | | | | | Not started |
| Navigation/settings | | | | | | Not started |
| Projects | | | | | | Not started |
| Workspace files | | | | | | Not started |
| Git | | | | | | Not started |
| Scripts and terminal | | | | | | Not started |
| Agents | | | | | | Not started |
| Agent monitor | | | | | | Not started |
| Prompt Builder | Fixture recorded at `c9abefc` | Prompt assembly only: [ticket 001](tickets/001-prompt-assembly.md), 16 of 16 golden cases. Storage and screens not ported | Partial | Not tested | Not tested | Not started |
| Tasks | | | | | | Not started |
| Starter projects | | | | | | Not started |
| Imported templates | | | | | | Not started |
| Dependencies | | | | | | Not started |
| Environment files | | | | | | Not started |
| Developer environment | | | | | | Not started |
| Formatting and code quality | | | | | | Not started |
| Browser and PiP | | | | | | Not started |
| API Studio scanning | | | | | | Not started |
| API Studio requests | | | | | | Not started |
| API Studio collections/docs | | | | | | Not started |
| DMG compiler | | | | N/A | N/A | Not started |
| Updates/diagnostics | | | | | | Not started |
| Legal and marketing | | | | | | Not started |
| Localization/accessibility | | | | | | Not started |
| Packaging/platforms | | | | | | Not started |

## Cross-cutting gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Data fidelity | | Not started |
| API/RPC compatibility (every member of `02-contract-manifest.md`) | | Not started |
| Process lifecycle | | Not started |
| Filesystem safety | | Not started |
| Security | | Not started |
| Offline/error handling | | Not started |
| Performance (thresholds still to be approved) | | Not started |
| OS matrix | | Not started |

## Intended differences already known (need approval)

- File reads become limited to granted project roots. Today they are not
  limited (`02-contract-manifest.md`, "Contract hazards").
