import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-store-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { readEnvironments, saveEnvironments } = await import(
  "../../../src/main/api-studio/environment-store"
);

const SECRETS = ["bearerToken"];

let projectPath: string;

function secretFile() {
  return path.join(userDataPath, "api-studio-environments.json");
}

function presetFile() {
  return path.join(projectPath, ".lazify", "api-studio", "environments.json");
}

beforeEach(() => {
  projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-project-"));
  fs.rmSync(secretFile(), { force: true });
});

afterEach(() => {
  fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("environment presets", () => {
  it("starts a project with one environment to fill in", () => {
    const set = readEnvironments(projectPath);

    expect(set.environments).toEqual([{ id: "local", name: "Local", values: {} }]);
    expect(set.activeId).toBe("local");
  });

  it("shares names and plain values through the project, keeping secrets on this machine", () => {
    saveEnvironments(
      projectPath,
      {
        activeId: "staging",
        environments: [
          { id: "local", name: "Local", values: { baseUrl: "http://localhost:5257", bearerToken: "local-token" } },
          { id: "staging", name: "Staging", values: { baseUrl: "https://staging.example.com", bearerToken: "staging-token" } }
        ]
      },
      SECRETS
    );

    const presets = JSON.parse(fs.readFileSync(presetFile(), "utf8"));
    const secrets = JSON.parse(fs.readFileSync(secretFile(), "utf8"));

    expect(presets.environments.map((environment: { name: string }) => environment.name)).toEqual([
      "Local",
      "Staging"
    ]);
    expect(presets.environments[1].values).toEqual({ baseUrl: "https://staging.example.com" });
    expect(JSON.stringify(presets)).not.toContain("staging-token");
    expect(secrets[projectPath].staging).toEqual({ bearerToken: "staging-token" });
    expect(fs.statSync(secretFile()).mode & 0o777).toBe(0o600);
  });

  it("hands back each environment with its secrets merged in, and remembers the active one", () => {
    saveEnvironments(
      projectPath,
      {
        activeId: "staging",
        environments: [
          { id: "local", name: "Local", values: { baseUrl: "http://localhost:5257" } },
          { id: "staging", name: "Staging", values: { baseUrl: "https://staging.example.com", bearerToken: "staging-token" } }
        ]
      },
      SECRETS
    );

    const set = readEnvironments(projectPath);

    expect(set.activeId).toBe("staging");
    expect(set.environments[1].values).toEqual({
      baseUrl: "https://staging.example.com",
      bearerToken: "staging-token"
    });
    expect(set.environments[0].values).toEqual({ baseUrl: "http://localhost:5257" });
  });

  it("keeps one project's environments away from another's", () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-env-other-"));

    saveEnvironments(
      projectPath,
      { activeId: "local", environments: [{ id: "local", name: "Local", values: { bearerToken: "mine" } }] },
      SECRETS
    );

    expect(readEnvironments(other).environments[0].values).toEqual({});

    fs.rmSync(other, { recursive: true, force: true });
  });

  it("reads the single set an earlier build stored as the first environment", () => {
    fs.writeFileSync(
      secretFile(),
      JSON.stringify({ [projectPath]: { bearerToken: "carried-over" } }),
      "utf8"
    );

    expect(readEnvironments(projectPath).environments[0].values).toEqual({
      bearerToken: "carried-over"
    });
  });

  it("drops a value that was cleared rather than storing an empty one", () => {
    saveEnvironments(
      projectPath,
      { activeId: "local", environments: [{ id: "local", name: "Local", values: { baseUrl: "http://localhost", bearerToken: "x" } }] },
      SECRETS
    );

    const set = saveEnvironments(
      projectPath,
      { activeId: "local", environments: [{ id: "local", name: "Local", values: { baseUrl: "http://localhost", bearerToken: "" } }] },
      SECRETS
    );

    expect(set.environments[0].values).toEqual({ baseUrl: "http://localhost" });
  });
});
