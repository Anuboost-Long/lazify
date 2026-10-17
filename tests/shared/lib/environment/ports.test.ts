import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every backend in ports.ts runs on an OS the others cannot, so the only way to
 * check the Windows parsing from anywhere is to feed each one the output its
 * tool really prints. Electron's Linux `ss` case has no counterpart: Chain runs
 * on macOS and Windows only, and its ports module has no Linux backend.
 */
const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  let replies: Record<string, string | Error> = {};

  return {
    calls,
    setReplies(next: Record<string, string | Error>) {
      replies = next;
      calls.length = 0;
    },
    reply(file: string, args: string[]): string | Error {
      calls.push(file);
      // Keyed by binary, except PowerShell, where the cmdlet is the question.
      const key =
        file === "powershell"
          ? (args.join(" ").match(/Get-\w+(-\w+)?/)?.[0] ?? "powershell")
          : file;
      return replies[key] ?? new Error(`no reply stubbed for ${key}`);
    }
  };
});

let os: "macos" | "windows" = "macos";

vi.mock("@/platform/exec", () => ({
  currentOs: async () => os,
  execFile: async (file: string, args: string[] = []) => {
    const result = mocks.reply(file, args);
    if (result instanceof Error) throw result;
    return { stdout: result, stderr: "" };
  }
}));

const { buildProcessTree, readCommandLines, scanListeningPorts } = await import(
  "@/shared/lib/environment/ports"
);

function pretend(platform: "darwin" | "win32") {
  os = platform === "win32" ? "windows" : "macos";
}

beforeEach(() => {
  mocks.setReplies({});
});

describe("scanListeningPorts", () => {
  it("parses lsof on macOS", async () => {
    pretend("darwin");
    mocks.setReplies({
      lsof: [
        "COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME",
        "node    41234 lazy   23u  IPv4 0x1234      0t0  TCP *:3000 (LISTEN)",
        "node    41234 lazy   24u  IPv6 0x5678      0t0  TCP [::]:5173 (LISTEN)"
      ].join("\n")
    });

    expect(await scanListeningPorts()).toEqual([
      { pid: 41234, port: 3000, command: "node", address: "*" },
      { pid: 41234, port: 5173, command: "node", address: "[::]" }
    ]);
  });

  it("uses Get-NetTCPConnection on Windows and names the pids from tasklist", async () => {
    pretend("win32");
    mocks.setReplies({
      "Get-NetTCPConnection": [
        '"LocalAddress","LocalPort","OwningProcess"',
        '"0.0.0.0","3000","4242"',
        '"::","5173","4242"'
      ].join("\r\n"),
      tasklist: '"node.exe","4242","Console","1","120,000 K"'
    });

    expect(await scanListeningPorts()).toEqual([
      { pid: 4242, port: 3000, command: "node.exe", address: "0.0.0.0" },
      { pid: 4242, port: 5173, command: "node.exe", address: "::" }
    ]);
  });

  // The state column is translated on a localised Windows, so the fallback has
  // to identify a listener by its empty peer address instead.
  it("falls back to netstat without reading the state column", async () => {
    pretend("win32");
    mocks.setReplies({
      "Get-NetTCPConnection": new Error("cmdlet not found"),
      tasklist: '"node.exe","4242","Console","1","120,000 K"',
      netstat: [
        "Aktive Verbindungen",
        "",
        "  Proto  Lokale Adresse    Remoteadresse     Status           PID",
        "  TCP    0.0.0.0:3000      0.0.0.0:0         ABHÖREN          4242",
        "  TCP    127.0.0.1:52001   127.0.0.1:3000    HERGESTELLT      9001"
      ].join("\r\n")
    });

    expect(await scanListeningPorts()).toEqual([
      { pid: 4242, port: 3000, command: "node.exe", address: "0.0.0.0" }
    ]);
  });

  it("answers with an empty list when no backend is available", async () => {
    pretend("darwin");
    mocks.setReplies({ lsof: new Error("spawn lsof ENOENT") });

    expect(await scanListeningPorts()).toEqual([]);
  });
});

describe("process table", () => {
  it("reads parents from CIM on Windows", async () => {
    pretend("win32");
    mocks.setReplies({
      "Get-CimInstance": ['"ProcessId","ParentProcessId"', '"4242","1000"', '"9001","4242"'].join("\r\n")
    });

    expect(await buildProcessTree()).toEqual(
      new Map([
        [4242, 1000],
        [9001, 4242]
      ])
    );
  });

  it("reads parents from ps elsewhere", async () => {
    pretend("darwin");
    mocks.setReplies({ ps: ["  PID  PPID", " 4242  1000", " 9001  4242"].join("\n") });

    expect(await buildProcessTree()).toEqual(
      new Map([
        [4242, 1000],
        [9001, 4242]
      ])
    );
  });

  it("reads command lines on Windows", async () => {
    pretend("win32");
    mocks.setReplies({
      "Get-CimInstance": ['"ProcessId","CommandLine"', '"4242","node server.js"'].join("\r\n")
    });

    expect(await readCommandLines()).toEqual(new Map([[4242, "node server.js"]]));
  });
});
