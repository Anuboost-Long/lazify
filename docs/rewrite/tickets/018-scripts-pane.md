# 018 — Scripts pane and terminal (Phase 4 / Done)

**Read this whole ticket before touching code.** The ported Workspace's
Scripts pane runs a project's scripts in Chain terminal sessions, shows
their output, survives a page reload, and stops them.

## Status — 2026-10-09

No code changes: the pane calls the `scripts` group (`listScripts`,
`runScript`, `stopScript`, `restartScript`, `listSessions`, `ptyBacklog`,
`onPtyData`, `onScriptStatus`), which tickets 004 and 005 built and ticket
015 put on the bridge. The renderer's terminal pool reattaches with
`ptyBacklog` and `seq`, as in Electron.

## Acceptance checklist and evidence

- [x] Real app, lazify-chain synced and opened, driven through the pane's
      own buttons with `chain inspect`:
      - **Scripts** listed the repository's eight scripts; **Run** on
        `preview` (`vite preview`) showed `Local: http://localhost:4173` in
        the pane's terminal, and `listSessions` reported the run holding
        port 4173
      - after `location.reload()` the app returned to the project; the run
        was still alive on 4173, its output was back in the pane, and the
        row offered **Stop** and **Restart**
      - **Stop** ended the session, and nothing was left listening on 4173
      - the project was removed afterwards
- [ ] Typing into an interactive script's terminal (covered for agents in
      ticket 008; the pane's keyboard path with a person)
