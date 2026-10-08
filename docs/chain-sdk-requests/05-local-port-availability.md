# Capability Request 05 — Tell the app whether a local TCP port is free

Source: the Lazify rewrite to Chain, Phase 2 ticket 005 (scripts). Rows:
Scripts and terminal, Developer environment.

**Not part of this request:**
- Listing listening ports or the process tree. Lazify gets those by running
  `lsof`, `ss`, `ps` or PowerShell and parsing the output
  (`src/main/environment/ports.ts`). That moves onto `process-runner`
  unchanged; parsing stays in the app.
- Stopping a process by pid. A later request, with the Developer
  environment slice, if `process-runner` can't cover it.
- Listening on a port. Lazify never serves anything itself here.

## Why this needs a new capability

The question is "would a server starting now be able to bind this port?".
Only an actual bind attempt answers it exactly. No existing capability opens
a socket: `http` makes outbound requests, `process-runner` and `terminal`
run programs. Running `lsof` for one port answers a different question (is
something *listening*), misses ports held by a socket that is bound but not
listening, and costs a process launch per probe. A restart probes every
150 ms.

## What Lazify actually does with this today (Electron, verified in source)

`src/main/environment/dev-port.ts`:

```ts
export function isPortFree(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const tester = net.createServer();
		tester.once("error", () => resolve(false));
		tester.once("listening", () => tester.close(() => resolve(true)));
		tester.listen(port, "0.0.0.0");
	});
}
```

Callers:
- **Dev-port injection** (`resolveDevPortInjection`). Before running a
  `dev`, `start` or `serve` script, Lazify works out the port the tool will
  use (5173 for Vite, 3000 for Next, and so on). If that port is taken it
  steps up one at a time, up to 100 ports, to the first free one, and passes
  it as `--port` and `PORT`. Two Vite apps can then run side by side.
- **.NET restart** (`waitForDotnetPortsFree`). After stopping `dotnet run`,
  Kestrel's listener can outlive the process for a moment. Lazify polls the
  ports from `launchSettings.json` every 150 ms, for up to 5 s, before
  relaunching, so the restart doesn't fail with "address already in use".

## What Lazify needs

- **Is this port free?** `true` when a TCP listener could bind it on this
  machine right now, `false` when it's in use. Close the probe socket
  straight away; nothing is left listening.
- **Which address it means.** Electron binds `0.0.0.0` (IPv4 only), so a
  server holding only `[::1]:5173` reads as free. Vite does exactly that by
  default on macOS. Lazify would rather "free" meant free for a dev server
  on either family, but the contract's choice of address(es) is Chain's;
  please say which it checks.
- **Fast enough to call in a loop:** up to about 100 sequential probes when
  stepping up from a busy port, and a probe every 150 ms during a restart.
- **Errors:** an invalid port (0, above 65535) rejects `INVALID_ARGUMENT`. A
  port the OS refuses for permission (below 1024 on some systems) should
  read as not free rather than reject, as Electron's `error` handler does.

## Platforms

macOS first (Lazify's first Chain release is macOS-only, D-2). Windows and
Linux with the same contract when Chain verifies them.

## Suggested next step for chain-sdk

A small addition: one function, wherever Chain thinks networking primitives
belong. When it ships, Lazify wires it into `dev-port.ts` and the .NET
restart wait, and verifies in a real app that a second Vite dev server moves
to 5174.
