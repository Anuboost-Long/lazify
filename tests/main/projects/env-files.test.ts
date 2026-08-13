import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addEnvVariable,
  createProjectEnvFile,
  deleteEnvVariable,
  listProjectEnvFiles,
  readProjectEnvFile,
  updateEnvVariable
} from "../../../src/main/projects/env";
import { parseEnvFile, renderEnvVariable } from "../../../src/main/projects/env/parse-env";

/**
 * A .env is often the only copy of a credential anyone has, so the tests that
 * matter most are the ones asserting what a write leaves *alone*.
 */
const SAMPLE = [
  "# Database",
  "DATABASE_URL=postgres://localhost:5432/app",
  "",
  "# PORT=3000",
  "SECRET_KEY=\"a value with spaces\"",
  "export NODE_ENV=production",
  "EMPTY=",
  "HASH_VALUE=pa#ssword # not the password",
  "",
  "# A closing note, not a variable"
].join("\n");

let project: string;

beforeEach(async () => {
  project = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-env-"));
  await fs.writeFile(path.join(project, ".env"), SAMPLE, "utf8");
});

afterEach(async () => {
  await fs.rm(project, { recursive: true, force: true });
});

describe("parseEnvFile", () => {
  it("lists every assignment, including the commented-out one", () => {
    const variables = parseEnvFile(SAMPLE);

    expect(variables.map((variable) => variable.key)).toEqual([
      "DATABASE_URL",
      "PORT",
      "SECRET_KEY",
      "NODE_ENV",
      "EMPTY",
      "HASH_VALUE"
    ]);
  });

  it("marks a commented-out assignment disabled rather than dropping it", () => {
    const port = parseEnvFile(SAMPLE).find((variable) => variable.key === "PORT");

    expect(port).toMatchObject({ value: "3000", enabled: false });
  });

  it("leaves prose comments out of the variable list", () => {
    expect(parseEnvFile(SAMPLE).some((variable) => variable.value.includes("closing note"))).toBe(false);
  });

  it("unwraps a quoted value and remembers the quote style", () => {
    const secret = parseEnvFile(SAMPLE).find((variable) => variable.key === "SECRET_KEY");

    expect(secret).toMatchObject({ value: "a value with spaces", quote: '"' });
  });

  it("keeps a hash that is part of the value, and splits off the real comment", () => {
    const hashed = parseEnvFile(SAMPLE).find((variable) => variable.key === "HASH_VALUE");

    expect(hashed).toMatchObject({ value: "pa#ssword", comment: "not the password" });
  });

  it("reads an export prefix without making it part of the name", () => {
    const nodeEnv = parseEnvFile(SAMPLE).find((variable) => variable.key === "NODE_ENV");

    expect(nodeEnv).toMatchObject({ key: "NODE_ENV", value: "production", exported: true });
  });

  it("refuses a value whose quote never closes, so it is never rewritten", () => {
    expect(parseEnvFile('MULTI="line one\nline two"')).toEqual([]);
  });
});

describe("renderEnvVariable", () => {
  const base = {
    line: 0,
    key: "KEY",
    value: "value",
    enabled: true,
    quote: "" as const,
    exported: false,
    comment: null,
    indent: ""
  };

  it("quotes a value that has grown a space", () => {
    expect(renderEnvVariable({ ...base, value: "two words" })).toBe('KEY="two words"');
  });

  it("quotes an emptied value so the line still reads as an assignment", () => {
    expect(renderEnvVariable({ ...base, value: "" })).toBe('KEY=""');
  });

  it("escapes a double quote inside the value", () => {
    expect(renderEnvVariable({ ...base, value: 'say "hi"' })).toBe('KEY="say \\"hi\\""');
  });

  it("promotes a single-quoted value that now contains an apostrophe", () => {
    expect(renderEnvVariable({ ...base, quote: "'", value: "it's" })).toBe('KEY="it\'s"');
  });

  it("comments out a disabled variable", () => {
    expect(renderEnvVariable({ ...base, enabled: false })).toBe("# KEY=value");
  });
});

describe("env file store", () => {
  it("lists root env files with their counts, .env first", async () => {
    await fs.writeFile(path.join(project, ".env.local"), "API_KEY=local\n", "utf8");

    const files = await listProjectEnvFiles(project);

    expect(files.map((file) => file.name)).toEqual([".env", ".env.local"]);
    expect(files[0]).toMatchObject({ variableCount: 6, disabledCount: 1 });
  });

  it("ignores files that are not env files", async () => {
    await fs.writeFile(path.join(project, "envy.txt"), "NOPE=1", "utf8");

    expect((await listProjectEnvFiles(project)).map((file) => file.name)).toEqual([".env"]);
  });

  it("returns nothing for a project it cannot read", async () => {
    expect(await listProjectEnvFiles(path.join(project, "missing"))).toEqual([]);
  });

  it("refuses to read outside the project", async () => {
    await expect(readProjectEnvFile(project, "../.env")).rejects.toThrow(/Not an env file/);
  });

  it("rewrites only the edited line", async () => {
    const before = await fs.readFile(path.join(project, ".env"), "utf8");
    const target = (await readProjectEnvFile(project, ".env")).variables.find(
      (variable) => variable.key === "DATABASE_URL"
    )!;

    await updateEnvVariable(project, ".env", target.line, "DATABASE_URL", {
      value: "postgres://localhost:5432/other"
    });

    const after = await fs.readFile(path.join(project, ".env"), "utf8");
    const changed = before
      .split("\n")
      .map((line, index) => (line === after.split("\n")[index] ? null : index))
      .filter((index) => index !== null);

    expect(changed).toEqual([1]);
    expect(after.split("\n")[1]).toBe("DATABASE_URL=postgres://localhost:5432/other");
  });

  it("comments a variable out and back in without losing its value", async () => {
    const read = async (key: string) =>
      (await readProjectEnvFile(project, ".env")).variables.find((variable) => variable.key === key)!;

    const secret = await read("SECRET_KEY");
    await updateEnvVariable(project, ".env", secret.line, "SECRET_KEY", { enabled: false });

    const disabled = await read("SECRET_KEY");
    expect(disabled).toMatchObject({ enabled: false, value: "a value with spaces" });

    await updateEnvVariable(project, ".env", disabled.line, "SECRET_KEY", { enabled: true });
    expect(await read("SECRET_KEY")).toMatchObject({ enabled: true, value: "a value with spaces" });
  });

  it("renames a variable in place", async () => {
    const target = (await readProjectEnvFile(project, ".env")).variables.find(
      (variable) => variable.key === "EMPTY"
    )!;

    const file = await updateEnvVariable(project, ".env", target.line, "EMPTY", { key: "BLANK" });

    expect(file.variables.map((variable) => variable.key)).toContain("BLANK");
    expect(file.variables.map((variable) => variable.key)).not.toContain("EMPTY");
  });

  it("refuses an edit aimed at a line the key has left", async () => {
    await expect(updateEnvVariable(project, ".env", 1, "SOMETHING_ELSE", { value: "x" })).rejects.toThrow(
      /no longer on line 2/
    );
  });

  it("adds after the last variable, keeping the closing comment last", async () => {
    await addEnvVariable(project, ".env", "NEW_KEY", "new value");

    const lines = (await fs.readFile(path.join(project, ".env"), "utf8")).split("\n");

    expect(lines.at(-1)).toBe("# A closing note, not a variable");
    expect(lines).toContain('NEW_KEY="new value"');
  });

  it("deletes the line a variable occupied", async () => {
    const target = (await readProjectEnvFile(project, ".env")).variables.find(
      (variable) => variable.key === "NODE_ENV"
    )!;

    const file = await deleteEnvVariable(project, ".env", target.line, "NODE_ENV");

    expect(file.variables.map((variable) => variable.key)).not.toContain("NODE_ENV");
    expect(await fs.readFile(path.join(project, ".env"), "utf8")).not.toContain("NODE_ENV");
  });

  it("creates an env file, and never truncates one that already exists", async () => {
    const created = await createProjectEnvFile(project, ".env.test");
    expect(created.variables).toEqual([]);

    await expect(createProjectEnvFile(project, ".env")).rejects.toThrow();
    expect(await fs.readFile(path.join(project, ".env"), "utf8")).toBe(SAMPLE);
  });

  it("adds the first variable to an empty file", async () => {
    await createProjectEnvFile(project, ".env.empty");

    const file = await addEnvVariable(project, ".env.empty", "FIRST", "1");

    expect(file.variables).toHaveLength(1);
    expect(file.variables[0]).toMatchObject({ key: "FIRST", value: "1", enabled: true });
  });
});
