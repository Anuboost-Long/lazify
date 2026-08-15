import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/lazify-tests" } }));

import { closeDatabase, useDatabase } from "../../src/main/db";
import { BUILTIN_PRESETS } from "../../src/main/prompts/builtin-presets";
import { seedBuiltinContext } from "../../src/main/prompts/builtin-context";
import {
  createEntry,
  deleteEntry,
  listEntries,
  setEntryActive,
  setPackActive
} from "../../src/main/prompts/context-store";
import {
  createPreset,
  deletePreset,
  listPresets,
  seedBuiltinPresets,
  updatePreset
} from "../../src/main/prompts/preset-store";
import { suggestPreset } from "../../src/main/prompts/preset-suggester";
import { renderTemplate, templateVariables } from "../../src/main/prompts/template-renderer";

const PROJECT = "/work/demo";

beforeEach(() => {
  useDatabase(new DatabaseSync(":memory:"));
  seedBuiltinPresets();
});

afterEach(() => closeDatabase());

describe("presets", () => {
  it("ships the built-ins and keeps them across a restart", () => {
    // Seeding runs on every launch; it must not duplicate what is there.
    seedBuiltinPresets();

    const builtins = listPresets().filter((preset) => preset.isBuiltin);

    expect(builtins).toHaveLength(BUILTIN_PRESETS.length);
    expect(builtins.map((preset) => preset.id)).toContain("builtin-bug-fix");
  });

  it("gives every built-in the task, the context and the precedence rule", () => {
    for (const preset of BUILTIN_PRESETS) {
      const variables = templateVariables(preset.template);

      expect(variables).toContain("task_name");
      expect(variables).toContain("task_description");
      expect(variables).toContain("project_context");
      expect(variables).toContain("priority");
      expect(variables).toContain("deadline");
      expect(preset.template).toContain("takes precedence");
    }
  });

  it("takes a custom preset of the user's own", () => {
    const created = createPreset({
      name: "Migration",
      description: "Database migrations",
      template: "Migrate {{project_name}}."
    });

    expect(listPresets().some((preset) => preset.id === created.id)).toBe(true);
  });

  it("refuses to edit or delete a built-in, so the defaults stay recoverable", () => {
    expect(
      updatePreset("builtin-general", { name: "x", description: "", template: "x" })
    ).toBeNull();
    expect(deletePreset("builtin-general")).toBe(false);
  });

  it("edits and deletes a custom preset", () => {
    const created = createPreset({ name: "Temp", description: "", template: "x" });

    expect(updatePreset(created.id, { name: "Renamed", description: "", template: "y" })).toEqual(
      expect.objectContaining({ name: "Renamed" })
    );
    expect(deletePreset(created.id)).toBe(true);
  });
});

describe("context entries", () => {
  const rule = {
    scope: "project" as const,
    scopeKey: PROJECT,
    type: "rule" as const,
    category: "Coding Rules",
    payload: { strength: "required", action: "follow the house style" },
    appliesTo: [],
    pack: "House rules",
    isActive: true,
    sortOrder: 0
  };

  it("switches one entry off without touching the rest", () => {
    const first = createEntry(rule);
    createEntry({ ...rule, payload: { strength: "required", action: "do the other thing" } });

    setEntryActive(first.id, false);

    const entries = listEntries(PROJECT);
    expect(entries.find((entry) => entry.id === first.id)?.isActive).toBe(false);
    expect(entries.filter((entry) => entry.isActive)).toHaveLength(1);
  });

  it("switches a whole pack at once, which is how a pack is plugged in", () => {
    createEntry(rule);
    createEntry({ ...rule, payload: { strength: "required", action: "do the other thing" } });
    createEntry({ ...rule, pack: "Other pack", payload: { strength: "required", action: "stay untouched" } });

    expect(setPackActive("project", PROJECT, "House rules", false)).toBe(2);

    const entries = listEntries(PROJECT);
    expect(entries.filter((entry) => entry.pack === "House rules" && entry.isActive)).toHaveLength(
      0
    );
    expect(entries.find((entry) => entry.pack === "Other pack")?.isActive).toBe(true);
  });

  it("keeps a shipped rule the user switched off switched off", () => {
    seedBuiltinContext();
    const shipped = listEntries(PROJECT).find((entry) => entry.pack === "Core working rules");

    setEntryActive(shipped!.id, false);
    // The next launch seeds again and must not undo the user's choice.
    seedBuiltinContext();

    expect(listEntries(PROJECT).find((entry) => entry.id === shipped!.id)?.isActive).toBe(false);
  });

  it("refuses to delete a shipped rule, and deletes the user's own", () => {
    seedBuiltinContext();
    const shipped = listEntries(PROJECT).find((entry) => entry.pack === "Core working rules");
    const mine = createEntry(rule);

    expect(deleteEntry(shipped!.id)).toBe(false);
    expect(deleteEntry(mine.id)).toBe(true);
  });
});

describe("suggesting a preset from what was typed", () => {
  it("reads an intent out of the wording", () => {
    expect(suggestPreset("fix the login redirect")).toBe("builtin-bug-fix");
    expect(suggestPreset("add task filtering")).toBe("builtin-new-feature");
    expect(suggestPreset("refactor the agent rail")).toBe("builtin-refactor");
    expect(suggestPreset("investigate why startup is slow")).toBe("builtin-research");
  });

  it("does not find a word inside another word", () => {
    expect(suggestPreset("update the address book")).toBeNull();
  });

  it("says nothing about an empty description", () => {
    expect(suggestPreset("   ")).toBeNull();
  });
});

describe("the template renderer", () => {
  it("substitutes what it is given", () => {
    expect(renderTemplate("Hello {{name}}.", { name: "Lazify" })).toBe("Hello Lazify.\n");
  });

  it("drops a heading whose only content was empty", () => {
    const rendered = renderTemplate("Task:\n{{task}}\n\nNotes:\n{{notes}}\n", {
      task: "Ship it",
      notes: ""
    });

    expect(rendered).toContain("Task:\nShip it");
    expect(rendered).not.toContain("Notes:");
  });

  it("leaves an unknown placeholder empty rather than printing it", () => {
    expect(renderTemplate("A {{missing}} B", {})).toBe("A  B\n");
  });
});
