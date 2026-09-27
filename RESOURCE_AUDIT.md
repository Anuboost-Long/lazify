# Resource and installation-size audit

This audit identifies likely resource costs and packaging waste. A short runtime profiler pass is still needed to measure RAM and CPU on a representative project and workload.

## Current size

| Item | Measured size | Share of the 313 MB installed app |
| --- | ---: | ---: |
| Installed `Lazify.app` | 313 MB | 100% |
| Electron Framework | 275 MB | 88% |
| Lazify application archive (`app.asar`) | 34 MB | 11% |
| Unpacked native dependencies | 2.7 MB | 1% |
| Chromium locale resources | 47.2 MB | 15% |

The current Apple Silicon download is 128 MB as a DMG and 129 MB as a ZIP. These are compressed download sizes, not the disk space required after installation.

## Highest-impact changes

| Priority | Finding | Why it costs resources | Recommended change | Expected effect |
| --- | --- | --- | --- |
| 1 | Mobile diagnostics bundled Appium, Android UiAutomator2, and iOS XCUITest | The local dependency directories alone were 8.2 MB, 71 MB, and 90 MB. Their packaged transitive dependencies dominated Lazify's 154 MB archive. | Removed the feature and its dependencies. | Largest installation-size reduction; likely well over 100 MB before compression. |
| 2 | Every production dependency was copied by `node_modules/**/*` | Renderer dependencies are bundled by Vite in `dist/assets`, yet their source packages were also copied into `app.asar`. | Replaced the broad rule with a main-process dependency list and explicit renderer dependency exclusions on macOS, Windows, and Linux. | `app.asar` fell from 72 MB to 34 MB; the Apple Silicon installed app fell from 351 MB to 313 MB. |
| 3 | Chromium ships every locale | Electron framework locale files consume 47.2 MB, while Lazify's own interface translations are independent JSON bundles. | Configure Electron Builder to ship only the Chromium locales the product supports, for example English plus any OS dialogs that must be localized. | Up to about 47 MB less per installed app. |
| 4 | Browser and preview webviews run without background throttling | Hidden tabs and preview pages retain timers, network activity, media playback, and renderer memory. Browser tabs intentionally stay mounted; the app shell also keeps the browser surface mounted outside its route. | Enable background throttling by default. Provide an explicit keep-playing option only for the active audible tab or preview. Suspend or destroy inactive tabs after a user-configured period. | Meaningful ongoing CPU, battery, and RAM reduction for browser-heavy sessions. |
| 5 | Terminal retention is generous | Up to eight detached Xterm instances are retained, each configured for 10,000 scrollback lines. | Reduce detached terminal count and scrollback defaults, and make larger history an opt-in setting. Dispose terminals as soon as their run is finished unless pinned. | Lower renderer memory in long agent sessions. |

## Features to reduce or make optional

### Mobile diagnostic testing

Removed from the project. Appium, the Android UiAutomator2 driver, and the iOS XCUITest driver no longer ship in the base application.

### Integrated browser and agent previews

Each webview is a Chromium renderer process. The browser preserves every tab and explicitly sets `backgroundThrottling=no`; the agent preview does the same. Media continuity is useful, but it should be an exception selected by the user, rather than the baseline for every hidden webview.

Suggested policy:

- Keep the active tab live.
- Throttle hidden tabs and hidden previews.
- Let one user-selected audible tab continue in the background.
- Discard inactive, non-audible tabs after a timeout and restore them on selection.

### Terminal history

The terminal pool already prevents unbounded growth, but its cap is still high for a laptop. Start with four detached terminals and 2,000 to 5,000 scrollback lines. Keep the terminal transcript on disk or in the PTY backlog for users who need to reopen older output.

## Secondary package reductions

| Package or asset | Current local size | Keep when | Reduction option |
| --- | ---: | --- | --- |
| Prettier | 9.6 MB | Auto-format-after-agent is a core feature | Make automatic formatting optional and use the project's installed Prettier when available. |
| Shiki | 13.6 MB | Rich syntax highlighting across many languages is required | Ship a smaller language set and load uncommon grammars on demand. |
| Iconoir React | 14 MB | The renderer needs icons | Exclude its source package from the Electron archive after confirming Vite's generated icon imports cover production. |
| Xterm | 6 MB | Embedded terminal is required | Exclude the source package from the Electron archive if the Vite bundle is self-contained. |
| Chakra Petch font files | 1.1 MB | Display typography is required | Retain only the weights used by the stylesheet: 500, 600, and 700. |
| Build icon sources | 304 KB in the repository | Platform builds need generated icons | They are not included in the installed app except for the selected platform icon. Removing them does not materially reduce an installation. |
| Templates | 32 KB in the installed app | Built-in templates are required | Retain; savings are negligible. |
| Website showcase images | several MB in `website/` | The marketing website is deployed | They are not included in the desktop installer. Optimize them separately only for website bandwidth. |

## Low-priority runtime work

- `watchAgentActivity` creates two non-persistent filesystem watchers for Codex and Claude transcripts. Its impact should be small, but it can be enabled only when the agent-usage feature is visible or enabled.
- Several visible-pane polls run every two to four seconds. They are already scoped to active features in most cases. Replace remaining polling with IPC events or filesystem watches only where profiling shows measurable work.
- API Studio performs a lightweight response cleanup every minute. The timer is unreferenced and is not a likely battery problem.

## Packaging tools retained

All remaining direct packaging tools are in use. Electron Builder produces the platform packages and invokes its bundled `@electron/rebuild` to compile the required `node-pty` native module. The redundant direct `@electron/rebuild` dependency was removed, and the project now uses `electron-builder install-app-deps` for its rebuild script.

macOS packaging also needs Xcode's built-in `hdiutil`, `codesign`, `xattr`, `ditto`, `actool`, and `plutil`; they create, sign, and assemble the DMG and app bundle. These are part of macOS/Xcode and should remain installed. Node.js and npm are required to run the project packaging scripts. Yarn is not used by the packaging command, but is installed globally and was not removed because it may serve other projects.

## What not to remove for size alone

- Electron is the installed-size floor. Replacing it is a product/platform rewrite, not a small optimization.
- App icons and bundled templates are too small to justify a feature tradeoff.
- Lazify's Chinese and Khmer JSON translations are code-split and small. Do not remove them to address installation size.

## Recommended order of implementation

1. Package only the required Chromium locales and measure a new installer.
2. Change webview retention and background throttling policy.
3. Lower terminal retention defaults and profile a long agent session.
4. Capture baseline and post-change measurements: installer size, installed size, cold-start time, idle RAM, browser-tab RAM, and eight-terminal RAM.

The diagnostic feature, its Appium dependencies, redundant direct rebuild dependency, and duplicated renderer package sources have been removed from the package. The current package sizes above were measured from a successful fresh macOS build.
