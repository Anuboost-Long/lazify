import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

const {
  DEFAULT_SCRIPT_GLOBAL,
  isUsableGlobal,
  readScriptSettings,
  saveScriptSettings
} = await import("@/shared/lib/api-studio/script-settings");
const { runPostResponse } = await import("@/shared/lib/api-studio/scripting/post-response");

let projectPath: string;

beforeEach(() => {
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-script-settings-"));
});

function response() {
  return {
    status: 200,
    statusText: "OK",
    durationMs: 4,
    headers: [],
    mediaType: "application/json",
    body: '{"accessToken":"abc123"}',
    bodyBytes: 24,
    truncated: false
  };
}

function draft() {
  return { method: "GET" as const, url: "http://localhost/users", headers: [], body: null };
}

describe("the name scripts reach the API through", () => {
  it("is lz until a project says otherwise", async () => {
    expect((await readScriptSettings(projectPath)).global).toBe(DEFAULT_SCRIPT_GLOBAL);
  });

  it("is kept in the project so a team writes the same scripts", async () => {
    await saveScriptSettings(projectPath, { global: "api" });

    expect((await readScriptSettings(projectPath)).global).toBe("api");
    expect(fs.existsSync(path.join(projectPath, ".lazify", "api-studio", "scripts.json"))).toBe(
      true
    );
  });

  it("refuses a name JavaScript already uses, or one that is not a name at all", async () => {
    expect(isUsableGlobal("api")).toBe(true);
    expect(isUsableGlobal("$")).toBe(true);
    expect(isUsableGlobal("JSON")).toBe(false);
    expect(isUsableGlobal("2fast")).toBe(false);
    expect(isUsableGlobal("my api")).toBe(false);

    await saveScriptSettings(projectPath, { global: "JSON" });

    expect((await readScriptSettings(projectPath)).global).toBe(DEFAULT_SCRIPT_GLOBAL);
  });

  it("binds the chosen name in the sandbox", () => {
    const result = runPostResponse(
      'api.env.set("token", api.response.json().accessToken);',
      draft(),
      response(),
      {},
      "api"
    );

    expect(result.run.error).toBeNull();
    expect(result.values).toEqual({ token: "abc123" });
  });

  it("keeps lz working whatever the project chose", () => {
    const result = runPostResponse('lz.log(lz.response.status);', draft(), response(), {}, "api");

    expect(result.run.error).toBeNull();
    expect(result.run.logs).toEqual(["200"]);
  });

  it("falls back to lz when handed a name it cannot bind", () => {
    const result = runPostResponse('lz.log("fine");', draft(), response(), {}, "not a name");

    expect(result.run.error).toBeNull();
    expect(result.run.logs).toEqual(["fine"]);
  });
});
