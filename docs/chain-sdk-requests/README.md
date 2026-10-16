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
| 07 | [Get the user's attention when the app is in the background](07-attention-alerts.md) | Shipped on macOS 2026-10-09, as `desktop.attention`; click path unverified |
| 08 | [Zoom the app's page](08-page-zoom.md) | Shipped on macOS 2026-10-09, as `desktop.pageZoom` |
| 09 | [Keep the Mac awake while an agent works](09-keep-awake.md) | Shipped on macOS 2026-10-09, as `desktop.keepAwake` |
| 10 | [Declare single read-only files](10-declared-read-only-files.md) | Shipped on macOS 2026-10-09: a declared entry may be a file (kind "file"); verified in the app |
| 11 | [The window's starting size, minimum size and title](11-window-size-and-title.md) | Shipped on macOS 2026-10-10, as `chain.window` `size`, `minSize`, `title`; verified in the app |
| 12 | [Tab reaches every button and link](12-tab-reaches-every-control.md) | Shipped on macOS 2026-10-10, as `chain.window` `tabFocus`; verified in the app |
| 13 | [`chain dev` starts when port 1420 is taken](13-dev-server-port-in-use.md) | Shipped 2026-10-10 in `chain dev`: steps to the next free port for Vite and the window; two apps at once not yet seen |
| 14 | [Copy a folder across volumes](14-copy-a-folder.md) | Sent and shipped 2026-10-11: `desktop.folders.move()` copies when it crosses volumes (links and modes kept); cross-volume not yet tried from Lazify |
| 15 | [Launch a program that outlives the app](15-launch-an-app-that-outlives-lazify.md) | Sent and shipped 2026-10-14 (chain-sdk working tree): `desktop.processRunner.launch(command, args)`, in its own session; `chain update` run. Not yet seen from Lazify: an editor surviving a quit |
| 16 | [Process output that keeps every byte](16-byte-exact-process-output.md) | Sent and shipped 2026-10-14 (chain-sdk working tree): `run(…, { output: "bytes" })` gives `Uint8Array` chunks; text mode no longer splits a character; `chain update` run |
| 17 | [Download and unpack a package Lazify can run](17-install-a-downloaded-package.md) | Sent and shipped 2026-10-14 (chain-sdk working tree) as a new capability, `desktop.packages`; `chain update` run. Both engines installed from Lazify |
| 18 | [An embedded, isolated web view inside the app's own window](18-embedded-browser-view.md) | Contract drafted 2026-10-16 as `desktop.browserView` (chain-sdk `agent-docs/capabilities/browser-view/CONTRACT.md`); macOS implementation under way. Reviewed by Lazify: fits, with two asks sent (an `inspectable` option for the preview's devtools, and documenting the right-click menu). Running script in a view stays out — a later request for media PiP and Lazy Shield's cosmetic half |
| 19 | [Trust a self-signed certificate on a loopback request](19-loopback-tls-trust.md) | Sent and shipped same day 2026-10-15, as `trustLoopbackCertificates` on `desktop.http.request()`; verified from Lazify against a real self-signed localhost HTTPS server, in the app |
| 20 | [An `appleEvents` app permission](20-apple-events-permission.md) | Sent and shipped 2026-10-16 as the `appleEvents` key in `chain.permissions`; ticket 033's Finder layout verified in the app after the owner's grant |
| 21 | [Filter and script the pages in an embedded view](21-filter-and-script-embedded-pages.md) | Sent 2026-10-17. Lazy Shield (block and hide by rules, early in-page script with a reply channel) and media picture-in-picture (script in every frame on demand) |

Overlap with Mneme: request 01's read-only allow-list design fork would also
answer Mneme's request 11 (`external-file-read`).

Planned and not yet written: importing Electron data, notifications,
keep-awake, keychain secrets, ports and process stop, language-server stdio,
archive unpacking, tracker/ad blocking and media PiP for the browser view
(request 18), the updater, the app menu and zoom. See `../rewrite/01-capability-inventory.md`.
