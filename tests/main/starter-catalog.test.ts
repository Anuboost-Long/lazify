import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readTemplate(name: string) {
  return JSON.parse(
    fs.readFileSync(path.resolve("templates", `${name}.json`), "utf8")
  ) as {
    createCommands: Record<string, string[]>;
    starter?: { repo: string; ref: string };
  };
}

describe("starter catalog pins", () => {
  it.each([
    ["next", "anuboost-lazify/next-scaffold"],
    ["expo", "anuboost-lazify/expo-scaffold"]
  ])("connects %s to an immutable starter and keeps its CLI fallback", (name, repo) => {
    const template = readTemplate(name);

    expect(template.starter).toEqual({ repo, ref: "v1.0.0" });
    expect(Object.keys(template.createCommands).length).toBeGreaterThan(0);
  });
});
