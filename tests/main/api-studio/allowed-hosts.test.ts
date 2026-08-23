import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { allowHost, forgetHost, readAllowedHosts } = await import(
  "../../../src/main/api-studio/allowed-hosts"
);

let projectPath: string;

beforeEach(() => {
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-project-"));
  fs.rmSync(path.join(userDataPath, "api-studio-allowed-hosts.json"), { force: true });
});

describe("hosts a project has been told are fine", () => {
  it("trusts nothing until it is told to", () => {
    expect(readAllowedHosts(projectPath)).toEqual([]);
  });

  it("remembers the host rather than the whole address", () => {
    allowHost(projectPath, "https://staging.example.com/users/42?page=2");

    expect(readAllowedHosts(projectPath)).toEqual(["staging.example.com"]);
  });

  it("covers every route on a host it already trusts", () => {
    allowHost(projectPath, "https://staging.example.com/users");
    allowHost(projectPath, "https://staging.example.com/orders");

    expect(readAllowedHosts(projectPath)).toEqual(["staging.example.com"]);
  });

  it("keeps a port apart, because a port is a different server", () => {
    allowHost(projectPath, "https://staging.example.com:8443/users");

    expect(readAllowedHosts(projectPath)).toEqual(["staging.example.com:8443"]);
  });

  it("keeps one project's answer out of another's", () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-other-"));

    allowHost(projectPath, "https://staging.example.com/users");

    expect(readAllowedHosts(other)).toEqual([]);
  });

  it("ignores an address it cannot read a host out of", () => {
    allowHost(projectPath, "not a url");

    expect(readAllowedHosts(projectPath)).toEqual([]);
  });

  it("takes a host back out again", () => {
    allowHost(projectPath, "https://staging.example.com/users");
    allowHost(projectPath, "https://api.example.com/users");

    expect(forgetHost(projectPath, "staging.example.com")).toEqual(["api.example.com"]);
    expect(readAllowedHosts(projectPath)).toEqual(["api.example.com"]);
  });

  it("stays on this machine, out of the project folder", () => {
    allowHost(projectPath, "https://staging.example.com/users");

    expect(fs.existsSync(path.join(userDataPath, "api-studio-allowed-hosts.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(false);
  });
});
