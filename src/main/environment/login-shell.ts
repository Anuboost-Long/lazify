/**
 * The platform's shell, ready to run one command string.
 *
 * Everything in the environment pane is a command line rather than a binary
 * plus argv — `npm install -g x && y`, an installer piped into bash — so it has
 * to go through a shell. On macOS and Linux that is a *login* shell, because
 * the PATH a user's tools live on (nvm, homebrew, ~/.local/bin) is assembled by
 * their profile and is not otherwise inherited by a GUI-launched app.
 *
 * Windows has neither of those shells. Spawning `bash` there fails with ENOENT
 * before the command is ever read, which is silent from the renderer's side —
 * the button reports failure and never says why. cmd.exe is the equivalent, and
 * needs no login flag: Windows hands the user's PATH to GUI processes already.
 */
export function loginShell(command: string): [string, string[]] {
  if (process.platform === "win32") {
    // /d skips AutoRun commands from the registry, which can print banners into
    // stdout and corrupt the version strings the callers parse.
    return [process.env.COMSPEC ?? "cmd.exe", ["/d", "/s", "/c", command]];
  }

  const shell = process.platform === "darwin" ? "zsh" : "bash";
  return [shell, ["-l", "-c", command]];
}
