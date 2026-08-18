import { describe, expect, it } from "vitest";

import { parseYamlDocument } from "../../../src/main/api-studio/yaml";

describe("parseYamlDocument", () => {
  it("reads nested mappings, sequences, and quoted keys", () => {
    const document = parseYamlDocument(
      [
        "openapi: 3.0.3",
        "paths:",
        "  /users/{id}:",
        "    get:",
        '      "operationId": getUser',
        "      tags:",
        "        - users",
        "        - admin"
      ].join("\n")
    ) as Record<string, any>;

    expect(document.openapi).toBe("3.0.3");
    expect(document.paths["/users/{id}"].get.operationId).toBe("getUser");
    expect(document.paths["/users/{id}"].get.tags).toEqual(["users", "admin"]);
  });

  it("reads a sequence of mappings and a sequence written at the parent indent", () => {
    const document = parseYamlDocument(
      [
        "servers:",
        "- url: http://localhost:3000",
        "  description: local",
        "parameters:",
        "  - name: id",
        "    in: path",
        "    required: true"
      ].join("\n")
    ) as Record<string, any>;

    expect(document.servers).toEqual([{ url: "http://localhost:3000", description: "local" }]);
    expect(document.parameters[0]).toEqual({ name: "id", in: "path", required: true });
  });

  it("reads flow collections and typed scalars", () => {
    const document = parseYamlDocument(
      ['tags: [users, "admin team"]', "schema: { type: string, nullable: true }", "port: 3000", "enabled: no", "note: ~"].join(
        "\n"
      )
    ) as Record<string, any>;

    expect(document.tags).toEqual(["users", "admin team"]);
    expect(document.schema).toEqual({ type: "string", nullable: true });
    expect(document.port).toBe(3000);
    expect(document.enabled).toBe(false);
    expect(document.note).toBeNull();
  });

  it("keeps literal blocks and folds folded blocks", () => {
    const document = parseYamlDocument(
      [
        "literal: |",
        "  first line",
        "  second line",
        "folded: >-",
        "  first line",
        "  second line",
        "after: done"
      ].join("\n")
    ) as Record<string, any>;

    expect(document.literal).toBe("first line\nsecond line\n");
    expect(document.folded).toBe("first line second line");
    expect(document.after).toBe("done");
  });

  it("drops comments without cutting a value that contains a hash", () => {
    const document = parseYamlDocument(
      ["# leading comment", "summary: Fetch a user # trailing comment", 'ref: "#/components/schemas/User"'].join("\n")
    ) as Record<string, any>;

    expect(document.summary).toBe("Fetch a user");
    expect(document.ref).toBe("#/components/schemas/User");
  });

  it("refuses constructs it cannot read instead of guessing", () => {
    expect(() => parseYamlDocument("base: &anchor\n  type: object")).toThrow(/anchors/i);
    expect(() => parseYamlDocument("---\na: 1\n---\nb: 2")).toThrow(/multi-document/i);
    expect(() => parseYamlDocument("a:\n\tb: 1")).toThrow(/tabs/i);
  });
});
