import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-"));
appFolders.data = userDataPath;

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({ restrictToOwner: async () => undefined }));

const { allowHost, forgetHost, readAllowedHosts } = await import(
  "@/shared/lib/api-studio/allowed-hosts"
);

let projectPath: string;

beforeEach(() => {
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-project-"));
  fs.rmSync(path.join(userDataPath, "api-studio-allowed-hosts.json"), { force: true });
});

describe("hosts a project has been told are fine", () => {
  it("trusts nothing until it is told to", async () => {
    expect(await readAllowedHosts(projectPath)).toEqual([]);
  });

  it("remembers the host rather than the whole address", async () => {
    await allowHost(projectPath, "https://staging.example.com/users/42?page=2");

    expect(await readAllowedHosts(projectPath)).toEqual(["staging.example.com"]);
  });

  it("covers every route on a host it already trusts", async () => {
    await allowHost(projectPath, "https://staging.example.com/users");
    await allowHost(projectPath, "https://staging.example.com/orders");

    expect(await readAllowedHosts(projectPath)).toEqual(["staging.example.com"]);
  });

  it("keeps a port apart, because a port is a different server", async () => {
    await allowHost(projectPath, "https://staging.example.com:8443/users");

    expect(await readAllowedHosts(projectPath)).toEqual(["staging.example.com:8443"]);
  });

  it("keeps one project's answer out of another's", async () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-allowed-hosts-other-"));

    await allowHost(projectPath, "https://staging.example.com/users");

    expect(await readAllowedHosts(other)).toEqual([]);
  });

  it("ignores an address it cannot read a host out of", async () => {
    await allowHost(projectPath, "not a url");

    expect(await readAllowedHosts(projectPath)).toEqual([]);
  });

  it("takes a host back out again", async () => {
    await allowHost(projectPath, "https://staging.example.com/users");
    await allowHost(projectPath, "https://api.example.com/users");

    expect(await forgetHost(projectPath, "staging.example.com")).toEqual(["api.example.com"]);
    expect(await readAllowedHosts(projectPath)).toEqual(["api.example.com"]);
  });

  it("stays on this machine, out of the project folder", async () => {
    await allowHost(projectPath, "https://staging.example.com/users");

    expect(fs.existsSync(path.join(userDataPath, "api-studio-allowed-hosts.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, ".lazify"))).toBe(false);
  });
});
