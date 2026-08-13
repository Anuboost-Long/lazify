import { existsSync } from "node:fs";

/** The four package managers worth covering, and the binary each is found at. */
const LINUX_PACKAGE_MANAGERS = [
  { id: "apt", binary: "/usr/bin/apt-get" },
  { id: "dnf", binary: "/usr/bin/dnf" },
  { id: "pacman", binary: "/usr/bin/pacman" },
  { id: "zypper", binary: "/usr/bin/zypper" }
] as const;

export type LinuxPackageManager = (typeof LINUX_PACKAGE_MANAGERS)[number]["id"];

/** Package names per distro family, for the tools whose names disagree. */
export type LinuxPackageNames = Partial<Record<LinuxPackageManager, string>>;

function findLinuxPackageManager(): { id: LinuxPackageManager; binary: string } | null {
  if (process.platform !== "linux") return null;
  return LINUX_PACKAGE_MANAGERS.find((entry) => existsSync(entry.binary)) ?? null;
}

/**
 * A package-manager command that needs root.
 *
 * `sudo` is unusable from here: these run with no terminal attached, so its
 * password prompt has nowhere to appear and the install hangs until it times
 * out. pkexec asks through the desktop's own authentication dialog instead.
 * Where there is no polkit agent to ask, the command is withheld rather than
 * offered and quietly broken — as it is for a distro whose package name for
 * this tool is not one worth guessing.
 */
export function linuxPackageCommand(
  packages: LinuxPackageNames,
  verb: "install" | "upgrade"
): string | null {
  const manager = findLinuxPackageManager();
  const pkg = manager ? packages[manager.id] : undefined;
  if (!manager || !pkg || !existsSync("/usr/bin/pkexec")) return null;

  const run = (args: string) => `pkexec ${manager.binary} ${args}`;

  switch (manager.id) {
    case "apt":
      return run(`${verb === "install" ? "install" : "install --only-upgrade"} -y ${pkg}`);
    case "dnf":
      return run(`${verb} -y ${pkg}`);
    case "pacman":
      // pacman has no separate upgrade verb for a single package: -S on an
      // installed one is the upgrade.
      return run(`-S --noconfirm ${pkg}`);
    case "zypper":
      return run(`${verb === "install" ? "install" : "update"} -y ${pkg}`);
  }
}

/**
 * A winget command for one catalogue ID. `-e` pins the match to that exact ID,
 * so a partial name cannot install something else that ranks higher.
 */
export function wingetCommand(id: string, verb: "install" | "upgrade"): string {
  return `winget ${verb} -e --id ${id} --accept-package-agreements --accept-source-agreements`;
}
