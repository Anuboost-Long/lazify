# Keyboard shortcuts

App-wide shortcuts, each changeable in **Settings → Keyboard**, ported from
Mneme's (`mneme/docs/features/32-keyboard-shortcuts.md`).

## Behaviour

| Action | Default (macOS) | Default (Windows/Linux) |
|---|---|---|
| Show or hide the sidebar | ⌘\ | Ctrl+\ |
| Start a new workflow | ⌘N | Ctrl+N |
| Open settings | ⌘, | Ctrl+, |
| Go to a file in this project | ⌘P | Ctrl+P |
| Zoom in | ⌘= | Ctrl+= |
| Zoom out | ⌘- | Ctrl+- |
| Actual size | ⌘0 | Ctrl+0 |

- "Go to a file" only does something on a project's workbench, where the
  quick-open palette lives.
- The three zoom shortcuts restore Electron Lazify's View-menu accelerators
  (`lazify/src/main/app-menu.ts`), which nothing handled on Chain.
- "Show or hide the sidebar" does nothing while **Compact sidebar** is on,
  the same as the sidebar button.
- A recorded combo is refused when it has no ⌘/⌃/⌥ (Ctrl/Alt elsewhere), when
  macOS or one of Lazify's fixed keys already uses it (copy, paste, find in
  code ⌘F, project search ⌘⇧F, save a request ⌘S, commit ⌘↩, …), or when
  another shortcut has it.
- Esc cancels recording; Tab still moves focus.

## Source

- `src/shared/lib/shortcuts.ts` — the list and defaults, `comboFromEvent`
  (reads the physical key, so ⌥ letters and ⇧ digits stay stable),
  `formatCombo`, `shortcutProblem`.
- `src/shared/hooks/use-shortcuts.ts` — `useShortcuts()` for Settings and
  `useShortcut(id, run)` for screens. Only changed shortcuts are saved, as
  JSON in `localStorage` under `lazify-shortcuts`, like the other interface
  settings. A change applies everywhere at once.
- `src/features/settings/components/KeyboardSection.tsx` — the settings
  screen.
- Wired in `src/app/AppShell.tsx` (sidebar, workflow, settings, zoom) and
  `src/shared/ui/command-palette/useFileQuickOpen.ts` (quick open).

## Dependencies

No Chain capability beyond what zoom already uses (`desktop.pageZoom`, via
`src/platform/zoom.ts`). Keys are read from the window's own `keydown`
events.

## Adding a shortcut

Add an entry to `shortcuts` in `src/shared/lib/shortcuts.ts` with its label
key, and call `useShortcut` where the action lives. Settings lists it
automatically.

## Acceptance

- Each default fires its action; a changed binding fires instead of the
  default, survives a restart, and Reset brings the default back.
- Recording refuses the three kinds of problem above with a message saying
  which.
- `tests/shared/lib/shortcuts.test.ts` covers combo reading, formatting and
  the refusals.
