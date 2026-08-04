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

  spawn("x-terminal-emulator", [], { cwd: targetPath, detached: true, stdio: "ignore" }).unref();
}
