import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every backend in ports.ts runs on an OS the others cannot, so the only way to
 * check the Windows and Linux parsing from anywhere is to feed each one the
 * output its tool really prints.
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

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");

  const execFile = (() => undefined) as unknown as Record<symbol, unknown>;
  execFile[promisify.custom] = async (file: string, args: string[] = []) => {
    const result = mocks.reply(file, args);
    if (result instanceof Error) throw result;
    return { stdout: result, stderr: "" };
  };

  return { execFile };
});

const { buildProcessTree, readCommandLines, scanListeningPorts } = await import(
  "../../../src/main/environment/ports"
);

const realPlatform = process.platform;

function pretend(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

beforeEach(() => {
  mocks.setReplies({});
});

afterEach(() => {
  Object.defineProperty(process, "platform", { value: realPlatform, configurable: true });
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

  it("falls back to ss on a Linux box with no lsof", async () => {
    pretend("linux");
    mocks.setReplies({
      lsof: new Error("spawn lsof ENOENT"),
      ss: [
        "State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process",
        'LISTEN 0      511          0.0.0.0:3000       0.0.0.0:*     users:(("node",pid=8080,fd=20))',
        // No process column: a socket owned by another user, and unusable here.
        "LISTEN 0      4096         127.0.0.1:631        0.0.0.0:*"
      ].join("\n")
    });

    expect(await scanListeningPorts()).toEqual([
      { pid: 8080, port: 3000, command: "node", address: "0.0.0.0" }
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
    pretend("linux");
    mocks.setReplies({
      lsof: new Error("spawn lsof ENOENT"),
      ss: new Error("spawn ss ENOENT")
    });

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
