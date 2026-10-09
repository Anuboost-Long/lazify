import { beforeEach, describe, expect, it, vi } from "vitest";

import { BUILTIN_PRESETS } from "@/features/prompts/lib/builtin-presets";
import { suggestPreset } from "@/features/prompts/lib/preset-suggester";
import { renderTemplate, templateVariables } from "@/features/prompts/lib/template-renderer";

import { createNodeStorage } from "../../platform/node-storage";

let storage = createNodeStorage();

vi.mock("@chain/sdk", () => ({
  desktop: {
    get storage() {
      return storage;
    }
  }
}));

let seedBuiltinContext: typeof import("@/features/prompts/lib/builtin-context").seedBuiltinContext;
let createEntry: typeof import("@/features/prompts/lib/context-store").createEntry;
let deleteEntry: typeof import("@/features/prompts/lib/context-store").deleteEntry;
let listEntries: typeof import("@/features/prompts/lib/context-store").listEntries;
let setEntryActive: typeof import("@/features/prompts/lib/context-store").setEntryActive;
let setPackActive: typeof import("@/features/prompts/lib/context-store").setPackActive;
let createPreset: typeof import("@/features/prompts/lib/preset-store").createPreset;
let deletePreset: typeof import("@/features/prompts/lib/preset-store").deletePreset;
let listPresets: typeof import("@/features/prompts/lib/preset-store").listPresets;
let seedBuiltinPresets: typeof import("@/features/prompts/lib/preset-store").seedBuiltinPresets;
let updatePreset: typeof import("@/features/prompts/lib/preset-store").updatePreset;

beforeEach(async () => {
  storage = createNodeStorage();
  vi.resetModules();
  ({ seedBuiltinContext } = await import("@/features/prompts/lib/builtin-context"));
  ({ createEntry, deleteEntry, listEntries, setEntryActive, setPackActive } = await import("@/features/prompts/lib/context-store"));
  ({ createPreset, deletePreset, listPresets, seedBuiltinPresets, updatePreset } = await import("@/features/prompts/lib/preset-store"));
});




const PROJECT = "/work/demo";

beforeEach(async () => {
  await seedBuiltinPresets();
});


describe("presets", () => {
  it("ships the built-ins and keeps them across a restart", async () => {
    // Seeding runs on every launch; it must not duplicate what is there.
    await seedBuiltinPresets();

    const builtins = (await listPresets()).filter((preset) => preset.isBuiltin);

    expect(builtins).toHaveLength(BUILTIN_PRESETS.length);
    expect(builtins.map((preset) => preset.id)).toContain("builtin-bug-fix");
  });

  it("gives every built-in the task, the context and the precedence rule", async () => {
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

  it("takes a custom preset of the user's own", async () => {
    const created = await createPreset({
      name: "Migration",
      description: "Database migrations",
      template: "Migrate {{project_name}}."
    });

    expect((await listPresets()).some((preset) => preset.id === created.id)).toBe(true);
  });

  it("refuses to edit or delete a built-in, so the defaults stay recoverable", async () => {
    expect(
      await updatePreset("builtin-general", { name: "x", description: "", template: "x" })
    ).toBeNull();
    expect(await deletePreset("builtin-general")).toBe(false);
  });

  it("edits and deletes a custom preset", async () => {
    const created = await createPreset({ name: "Temp", description: "", template: "x" });

    expect(await updatePreset(created.id, { name: "Renamed", description: "", template: "y" })).toEqual(
      expect.objectContaining({ name: "Renamed" })
    );
    expect(await deletePreset(created.id)).toBe(true);
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

  it("switches one entry off without touching the rest", async () => {
    const first = await createEntry(rule);
    await createEntry({ ...rule, payload: { strength: "required", action: "do the other thing" } });

    await setEntryActive(first.id, false);

    const entries = await listEntries(PROJECT);
    expect(entries.find((entry) => entry.id === first.id)?.isActive).toBe(false);
    expect(entries.filter((entry) => entry.isActive)).toHaveLength(1);
  });

  it("switches a whole pack at once, which is how a pack is plugged in", async () => {
    await createEntry(rule);
    await createEntry({ ...rule, payload: { strength: "required", action: "do the other thing" } });
    await createEntry({ ...rule, pack: "Other pack", payload: { strength: "required", action: "stay untouched" } });

    expect(await setPackActive("project", PROJECT, "House rules", false)).toBe(2);

    const entries = await listEntries(PROJECT);
    expect(entries.filter((entry) => entry.pack === "House rules" && entry.isActive)).toHaveLength(
      0
    );
    expect(entries.find((entry) => entry.pack === "Other pack")?.isActive).toBe(true);
  });

  it("keeps a shipped rule the user switched off switched off", async () => {
    await seedBuiltinContext();
    const shipped = (await listEntries(PROJECT)).find((entry) => entry.pack === "Core working rules");

    await setEntryActive(shipped!.id, false);
    // The next launch seeds again and must not undo the user's choice.
    await seedBuiltinContext();

    expect((await listEntries(PROJECT)).find((entry) => entry.id === shipped!.id)?.isActive).toBe(false);
  });

  it("refuses to delete a shipped rule, and deletes the user's own", async () => {
    await seedBuiltinContext();
    const shipped = (await listEntries(PROJECT)).find((entry) => entry.pack === "Core working rules");
    const mine = await createEntry(rule);

    expect(await deleteEntry(shipped!.id)).toBe(false);
    expect(await deleteEntry(mine.id)).toBe(true);
  });
});

describe("suggesting a preset from what was typed", () => {
  it("reads an intent out of the wording", async () => {
    expect(suggestPreset("fix the login redirect")).toBe("builtin-bug-fix");
    expect(suggestPreset("add task filtering")).toBe("builtin-new-feature");
    expect(suggestPreset("refactor the agent rail")).toBe("builtin-refactor");
    expect(suggestPreset("investigate why startup is slow")).toBe("builtin-research");
  });

  it("does not find a word inside another word", async () => {
    expect(suggestPreset("update the address book")).toBeNull();
  });

  it("says nothing about an empty description", async () => {
    expect(suggestPreset("   ")).toBeNull();
  });
});

describe("the template renderer", () => {
  it("substitutes what it is given", async () => {
    expect(renderTemplate("Hello {{name}}.", { name: "Lazify" })).toBe("Hello Lazify.\n");
  });

  it("drops a heading whose only content was empty", async () => {
    const rendered = renderTemplate("Task:\n{{task}}\n\nNotes:\n{{notes}}\n", {
      task: "Ship it",
      notes: ""
    });

    expect(rendered).toContain("Task:\nShip it");
    expect(rendered).not.toContain("Notes:");
  });

  it("leaves an unknown placeholder empty rather than printing it", async () => {
    expect(renderTemplate("A {{missing}} B", {})).toBe("A  B\n");
  });
});
