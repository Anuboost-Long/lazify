import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { loginShell } from "../login-shell";
import { wingetCommand } from "./package-managers";
import { probe } from "./probe";
import { CANNOT_CHECK, type ToolModule } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Rust installs through rustup on every platform rather than a package
 * manager, and rustup is also what answers whether an update exists.
 */
export const cargoTool: ToolModule = {
  name: "cargo",
  displayName: "Rust / Cargo",
  category: "system",

  probe: () => probe("cargo"),

  install: () =>
    process.platform === "win32"
      ? { command: wingetCommand("Rustlang.Rustup", "install") }
      : { command: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y" },

  update: () => "rustup update",

  async checkUpdate() {
    try {
      const { stdout } = await execFileAsync(...loginShell("rustup check"), {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      });
      return { hasUpdate: stdout.includes("Update available"), latestVersion: null, canCheck: true };
    } catch {
      return CANNOT_CHECK;
    }
  }
};
