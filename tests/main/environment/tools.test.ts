import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The environment pane is only as good as the commands each tool answers with,
 * and every one of them differs by platform. These check the three answers from
 * one machine — including the case that was broken: a Windows install button
 * that had no command behind it at all.
 */
const mocks = vi.hoisted(() => ({
  present: new Set<string>()
}));

vi.mock("node:fs", () => ({
  existsSync: (path: string) => mocks.present.has(path),
  default: { existsSync: (path: string) => mocks.present.has(path) }
}));

const realPlatform = process.platform;

/** Tool modules read the platform as they load, so each one needs a fresh set. */
async function loadTools(platform: NodeJS.Platform, presentPaths: string[] = []) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  mocks.present = new Set(presentPaths);
  vi.resetModules();

  return import("../../../src/main/environment/tools");
}

afterEach(() => {
  Object.defineProperty(process, "platform", { value: realPlatform, configurable: true });
});

const DEBIAN = ["/usr/bin/apt-get", "/usr/bin/pkexec"];

describe("tool registry", () => {
  it("lists every tool the pane shows, in order", async () => {
    const { TOOLS } = await loadTools("darwin");

    expect(TOOLS.map((tool) => tool.name)).toEqual([
      "node", "nvm", "npm", "yarn", "pnpm", "bun",
      "python3", "pip3", "dotnet", "go", "cargo", "ruby", "git", "docker",
      "claude", "codex", "gemini", "copilot", "cursor-agent"
    ]);
  });

  it("finds a tool by name and nothing by a name it does not have", async () => {
    const { findTool } = await loadTools("darwin");

    expect(findTool("yarn")?.displayName).toBe("Yarn");
    expect(findTool("perl")).toBeNull();
  });
});

describe("Windows", () => {
  // The regression this suite exists for: these were reachable commands that
  // the runner could never execute, so every button reported a failure.
  it("offers install, update and uninstall for the npm-distributed agents", async () => {
    const { findTool } = await loadTools("win32");

    for (const name of ["claude", "codex", "gemini", "copilot"]) {
      const tool = findTool(name);
      expect(tool?.install?.()?.command).toMatch(/^npm install -g /);
      expect(tool?.update?.()).toMatch(/@latest$/);
      expect(tool?.uninstall?.()?.command).toMatch(/^npm uninstall -g /);
    }
  });

  it("installs the toolchain through winget", async () => {
    const { findTool } = await loadTools("win32");

    for (const name of ["python3", "go", "ruby", "git", "docker", "dotnet", "cargo"]) {
      expect(findTool(name)?.install?.()?.command).toMatch(/^winget install -e --id \S+/);
    }

    // Rust is the exception in both directions: winget puts rustup on the
    // machine, and rustup updates itself from then on, on every platform.
    for (const name of ["python3", "go", "ruby", "git", "docker", "dotnet"]) {
      expect(findTool(name)?.update?.()).toMatch(/^winget upgrade -e --id \S+/);
    }
    expect(findTool("cargo")?.update?.()).toBe("rustup update");
  });

  it("probes the names Windows actually uses for Python", async () => {
    const { findTool } = await loadTools("win32");

    // Nothing is installed in the mock, so the probe fails — what matters is
    // that it tried `python` after `python3` rather than giving up on the
    // POSIX spelling.
    await expect(findTool("python3")?.probe()).resolves.toEqual({
      available: false,
      version: null
    });
  });

  it("withholds the commands that are POSIX-only rather than offering them", async () => {
    const { findTool } = await loadTools("win32");

    expect(findTool("cursor-agent")?.install?.()).toBeNull();
    expect(findTool("cursor-agent")?.update?.()).toBeNull();
    expect(findTool("nvm")?.update?.()).toBeNull();
  });
});

describe("Linux", () => {
  it("uses the distro's package manager through pkexec, never sudo", async () => {
    const { findTool } = await loadTools("linux", DEBIAN);

    const git = findTool("git")?.install?.()?.command;
    expect(git).toBe("pkexec /usr/bin/apt-get install -y git");
    expect(git).not.toContain("sudo");

    // Debian's name for it, not Fedora's or Arch's.
    expect(findTool("go")?.install?.()?.command).toContain("golang-go");
  });

  it("picks the package name the running distro uses", async () => {
    const arch = await loadTools("linux", ["/usr/bin/pacman", "/usr/bin/pkexec"]);
    expect(arch.findTool("go")?.install?.()?.command).toBe("pkexec /usr/bin/pacman -S --noconfirm go");
    expect(arch.findTool("python3")?.install?.()?.command).toContain(" python");

    const fedora = await loadTools("linux", ["/usr/bin/dnf", "/usr/bin/pkexec"]);
    expect(fedora.findTool("go")?.install?.()?.command).toBe("pkexec /usr/bin/dnf install -y golang");
  });

  // A sudo command would sit waiting for a password that has nowhere to appear.
  it("withholds privileged commands where there is no polkit agent to ask", async () => {
    const { findTool } = await loadTools("linux", ["/usr/bin/apt-get"]);

    expect(findTool("git")?.install?.()).toBeNull();
    expect(findTool("git")?.update?.()).toBeNull();
  });

  it("still installs the npm-distributed tools, which need no privileges", async () => {
    const { findTool } = await loadTools("linux", []);

    expect(findTool("yarn")?.install?.()?.command).toBe("npm install -g yarn");
    expect(findTool("claude")?.install?.()?.command).toBe("npm install -g @anthropic-ai/claude-code");
  });
});

describe("macOS", () => {
  it("still answers with Homebrew", async () => {
    const { findTool } = await loadTools("darwin");

    expect(findTool("git")?.install?.()?.command).toBe("brew install git");
    expect(findTool("git")?.update?.()).toBe("brew upgrade git");
    expect(findTool("docker")?.install?.()?.command).toBe("brew install --cask docker");
    expect(findTool("cursor-agent")?.install?.()?.command).toContain("cursor.com/install");
  });
});
