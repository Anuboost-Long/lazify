# Chain SDK capability requests

Native features Lazify needs from Chain SDK (`../../../chain-sdk`). Each file
follows the same format as Mneme's requests, and Chain's
`docs/CAPABILITY_WORKFLOW.md` explains what Chain does with one.

Each request:
- names a **real** need, with the Electron code that proves it (Chain rule 7),
- says what is **not** part of the request,
- explains why existing capabilities do not cover it, quoting their contracts,
- asks for primitives, never Lazify features. The contract's shape is
  Chain's decision (rule 2),
- surveys macOS and Windows honestly, saying "not verified" where that is true.

| # | Request | Status |
| --- | --- | --- |
| 01 | [Work inside folders the user chose](01-project-folder-access.md) | Shipped on macOS 2026-10-09, as `desktop.folders` |
| 02 | [Tell the app when files in a folder change](02-file-change-events.md) | Shipped on macOS 2026-10-09, as `desktop.folders` `watch()` |
| 03 | [Run a process in a chosen folder, with extra environment variables](03-process-working-directory-and-environment.md) | Shipped on macOS 2026-10-09, in `process-runner` |
| 04 | [Interactive terminal sessions that outlive a page reload](04-terminal-sessions.md) | Shipped on macOS 2026-10-09, as `desktop.terminal` |
| 05 | [Tell the app whether a local TCP port is free](05-local-port-availability.md) | Shipped on macOS 2026-10-09, as `desktop.ports` |
| 06 | [Folders the app owns, with real paths its processes can use](06-app-owned-folders.md) | Shipped on macOS 2026-10-09, as `desktop.folders.appFolder` |
| 07 | [Get the user's attention when the app is in the background](07-attention-alerts.md) | Sent to chain-sdk 2026-10-09 |

Overlap with Mneme: request 01's read-only allow-list design fork would also
answer Mneme's request 11 (`external-file-read`).

Planned and not yet written: importing Electron data, notifications,
keep-awake, keychain secrets, ports and process stop, language-server stdio,
archive unpacking, an embedded browser view, the updater, the app menu and
zoom. See `../rewrite/01-capability-inventory.md`.
