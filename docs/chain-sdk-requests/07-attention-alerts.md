# Capability Request 07 — Get the user's attention when the app is in the background

Source: the Lazify rewrite to Chain, Phase 2 ticket 008 (agents). Rows: AI
agents, Agent live monitor.

**Not part of this request:**
- Keep-awake (stopping the Mac sleeping while an agent works). A later
  request with the autopilot and keep-awake slice.
- In-app toasts. Lazify draws those itself.
- Scheduled or push notifications. Lazify only notifies about something
  happening right now in a process it runs.

## Why this needs a new capability

`window` controls the window's appearance and position. Nothing in Chain
says whether the window has focus, shows a system notification, or asks
the Dock for attention. An agent that needs an answer while the user is in
another app would otherwise wait silently.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/main.ts`, `emitAttention` and `emitTurnDone`:

```ts
if (!waiting || mainWindow?.isFocused()) return;

if (Notification.isSupported()) {
	new Notification({
		title: `${session.scriptName} needs you`,
		body: `${session.projectName} is waiting for a response.`,
		icon: APP_ICON_PATH,
	}).show();
}

app.dock?.bounce("informational");
```

- **When an agent is waiting** for a permission or an answer: notify, and
  bounce the Dock icon once (`informational`), but only when the window
  isn't focused.
- **When an agent finishes its turn**: the same, and **clicking the
  notification** brings the window forward (restore if minimised, show,
  focus) and tells the page which run to open (`focusRun`).
- Notifications are skipped when the platform doesn't support them.

## What Lazify needs

1. **Is the window focused?** Plus a change event is welcome, but a query
   at the moment of deciding is enough.
2. **Show a system notification** with a title and body, using the app's
   icon. Lazify passes an identifier of its own; when the user clicks the
   notification, Chain brings the window forward and tells the page which
   notification was clicked, so Lazify can open that agent's run.
3. **Ask for attention:** bounce the Dock icon once (macOS
   "informational"). On Windows the equivalent is flashing the taskbar
   button; Lazify only needs the macOS one now.
4. **Permission:** macOS asks the user to allow notifications. Lazify needs
   to know whether they're allowed or denied, so it can say why nothing
   appeared, and should never fail because they were denied.

## Platforms

macOS first (D-2).

## Suggested next step for chain-sdk

When it ships, Lazify wires it into ticket 008's attention and turn-done
events and verifies with the window in the background: a waiting agent
notifies and bounces once; clicking the notification focuses the window and
opens the run.
