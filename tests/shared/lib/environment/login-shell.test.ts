import { afterEach, describe, expect, it } from "vitest";

import { host, type HostPlatform } from "@/shared/lib/environment/host";
import { loginShell } from "@/shared/lib/environment/login-shell";

function pretend(platform: HostPlatform) {
  host.platform = platform;
}

afterEach(() => {
  host.platform = "darwin";
  host.env = {};
});

describe("loginShell", () => {
  it("uses a zsh login shell on macOS", () => {
    pretend("darwin");

    expect(loginShell("npm view yarn version")).toEqual([
      "zsh",
      ["-l", "-c", "npm view yarn version"]
    ]);
  });

  it("uses a bash login shell on Linux", () => {
    pretend("linux");

    expect(loginShell("npm view yarn version")).toEqual([
      "bash",
      ["-l", "-c", "npm view yarn version"]
    ]);
  });

  // The bug this exists to stop coming back: `bash` is not on Windows, so the
  // whole environment pane failed with ENOENT before the command was read.
  it("uses cmd.exe on Windows, never a POSIX shell", () => {
    pretend("win32");

    const [binary, args] = loginShell("npm install -g yarn");

    expect(binary).toBe("cmd.exe");
    expect(binary).not.toMatch(/sh$/);
    expect(args).toEqual(["/d", "/s", "/c", "npm install -g yarn"]);
  });

  it("prefers COMSPEC when Windows names a different interpreter", () => {
    pretend("win32");
    host.env = { COMSPEC: "C:\\Windows\\System32\\cmd.exe" };

    expect(loginShell("git --version")[0]).toBe("C:\\Windows\\System32\\cmd.exe");
  });
});
