# Capability Request 13 — `chain dev` starts when port 1420 is taken

Source: the Lazify rewrite to Chain, found running `chain dev` on
2026-10-10. Not tied to a ticket: it's the development loop itself.

**Not part of this request:**
- Anything at runtime or in `chain build`. A release build has no dev
  server.
- Lazify's own dev-port stepping for the user's project scripts (ticket
  005, on `desktop.ports`). That already works.

## Why this needs a change in Chain

Every Chain app's template pins its dev server to one port:
`vite.config.ts` sets `server.port: 1420` with `strictPort: true` ("tauri
expects a fixed port"), and `.chain/native/tauri.conf.json` sets
`devUrl` to `http://localhost:1420`. `chain dev` passes neither through.
So any two Chain apps can't run in development at the same time, and
the second one fails:

```
Native     ✘  starting…
Error: Port 1420 is already in use
   Error The "beforeDevCommand" terminated with a non-zero status code.
✘ tauri dev failed (exit 1).
```

On 2026-10-10 the port was held by chain-sdk's own playground
(`apps/playground`, `npm run dev`) while lazify-chain was started. Both
are Chain apps on the same machine, which is the normal case while an
app and the SDK are developed side by side. The app can't fix this
alone: changing only `vite.config.ts` leaves the native window loading
`devUrl` on 1420, which is the *other* app, and `tauri.conf.json` is
framework-owned.

Seen earlier too (`../rewrite/05-work-queue.md`, Sprint A): on
lazify-chain's first `chain dev`, Tauri ran `beforeDevCommand` a second
time while the first Vite still held 1420. That run exited 1 but left
`chain dev`, Vite and two app processes behind.

## What Lazify needs

- When 1420 is in use, `chain dev` uses the next free port (1421, 1422,
  …) for that run. It's the same rule Electron Lazify applies to project
  dev servers (`src/main/environment/dev-port.ts`), which users already
  expect.
- The dev server **and** the native window both use the chosen port, so
  the window always loads its own app.
- The condensed output names the port it used (`Frontend ●
  http://localhost:1421/`), and `chain inspect` still finds the right
  app when two are running.
- A failed start doesn't leave Vite or app processes running.

## Platforms

macOS first (D-2). The same port clash happens on Windows: not verified.

## Suggested next step for chain-sdk

When it ships, Lazify runs `chain update`, starts the playground and
lazify-chain together, and checks that each window shows its own app.
