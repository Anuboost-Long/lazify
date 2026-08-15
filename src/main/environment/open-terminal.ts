import { spawn } from "node:child_process";
import fs from "node:fs";

/**
 * Opens the OS's terminal app rooted at `targetPath`, the way a file
 * manager's "Open in Terminal" does. A path that is not on disk is left
 * alone, same as reveal-in-file-manager.
 */
export function openTerminal(targetPath: string): void {
  if (!targetPath || !fs.existsSync(targetPath)) return;

  if (process.platform === "darwin") {
    // Terminal.app opens a new window at the given folder when it's passed
    // as an argument, the same as double-clicking it in the dock would.
    spawn("open", ["-a", "Terminal", targetPath], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "win32") {
    // `start` reads its first quoted argument as the new window's title, not
    // part of the command — without the empty `""` here it would mistake
    // "cmd.exe" for the title and launch nothing.
    spawn("cmd.exe", ["/c", "start", "", "cmd.exe"], {
      cwd: targetPath,
      detached: true,
      stdio: "ignore"
    }).unref();
    return;
  }

  openLinuxTerminal(targetPath);
}

/**
 * Linux has no one terminal, and no one way to ask for it.
 *
 * `x-terminal-emulator` is a Debian alternatives symlink — it is not on Fedora,
 * Arch or SUSE, so a single spawn of it fails silently on most of the desktop
 * Linux world. There is no reliable way to ask which terminal is installed
 * without running one, so this walks the list and stops at the first that
 * starts. `spawn` reports a missing binary asynchronously, through an `error`
 * event rather than a throw, which is why each candidate is raced rather than
 * tried in a try/catch.
 */
function openLinuxTerminal(targetPath: string): void {
  const candidates = [
    // The distro's own choice first, where the distro makes one.
    { binary: "x-terminal-emulator", args: [] },
    { binary: "gnome-terminal", args: [] },
    { binary: "konsole", args: ["--workdir", targetPath] },
    { binary: "xfce4-terminal", args: [] },
    { binary: "kgx", args: [] },
    { binary: "tilix", args: [] },
    { binary: "alacritty", args: [] },
    { binary: "kitty", args: [] },
    { binary: "foot", args: [] },
    { binary: "xterm", args: [] }
  ];

  const tryNext = (index: number) => {
    const candidate = candidates[index];
    if (!candidate) return;

    const child = spawn(candidate.binary, candidate.args, {
      cwd: targetPath,
      detached: true,
      stdio: "ignore"
    });

    // ENOENT lands here, not on the call above.
    child.on("error", () => tryNext(index + 1));
    child.unref();
  };

  tryNext(0);
}
