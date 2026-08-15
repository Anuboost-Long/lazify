import { describe, expect, it } from "vitest";

import { compareToLatest, parseNpmViewVersion } from "../../../src/main/environment/tools/update-checks";

describe("parseNpmViewVersion", () => {
  // The shape when the range matches exactly one version.
  it("reads a bare version", () => {
    expect(parseNpmViewVersion("10.9.9\n")).toBe("10.9.9");
  });

  // The shape when it matches several — and the reason this function exists:
  // npm lists them oldest first, so the answer is the last line, not the first.
  it("takes the newest of a list, not the oldest", () => {
    const stdout = ["npm@10.0.0 '10.0.0'", "npm@10.8.2 '10.8.2'", "npm@10.9.9 '10.9.9'"].join("\n");

    expect(parseNpmViewVersion(stdout)).toBe("10.9.9");
  });

  it("answers nothing for empty output", () => {
    expect(parseNpmViewVersion("  \n ")).toBeNull();
  });
});

describe("compareToLatest", () => {
  it("does not call the same version, written differently, an update", () => {
    expect(compareToLatest("v20.1.0", "20.1.0")).toEqual({
      hasUpdate: false,
      latestVersion: "20.1.0",
      canCheck: true
    });
  });

  it("reports an update when the versions differ", () => {
    expect(compareToLatest("10.8.2", "10.9.9")).toEqual({
      hasUpdate: true,
      latestVersion: "10.9.9",
      canCheck: true
    });
  });

  it("cannot check when nothing came back", () => {
    expect(compareToLatest("10.8.2", null).canCheck).toBe(false);
  });
});
