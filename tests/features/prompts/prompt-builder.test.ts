import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextEntryInput } from "@/features/prompts/lib/types";

import { createNodeStorage } from "../../platform/node-storage";

let storage = createNodeStorage();

vi.mock("@chain/sdk", () => ({
  desktop: {
    get storage() {
      return storage;
    }
  }
}));

let createEntry: typeof import("@/features/prompts/lib/context-store").createEntry;
let buildPrompt: typeof import("@/features/prompts/lib/prompt-builder").buildPrompt;
let seedBuiltinContext: typeof import("@/features/prompts/lib/builtin-context").seedBuiltinContext;
let seedBuiltinPresets: typeof import("@/features/prompts/lib/preset-store").seedBuiltinPresets;

beforeEach(async () => {
  storage = createNodeStorage();
  vi.resetModules();
  ({ createEntry } = await import("@/features/prompts/lib/context-store"));
  ({ buildPrompt } = await import("@/features/prompts/lib/prompt-builder"));
  ({ seedBuiltinContext } = await import("@/features/prompts/lib/builtin-context"));
  ({ seedBuiltinPresets } = await import("@/features/prompts/lib/preset-store"));
});


// The stores reach for app.getPath; every test here opens its own database.


const PROJECT = "/work/demo";

function entry(overrides: Partial<ContextEntryInput>): ContextEntryInput {
  return {
    scope: "project",
    scopeKey: PROJECT,
    type: "rule",
    category: "Coding Rules",
    payload: { strength: "required", action: "follow the house style" },
    appliesTo: [],
    pack: "",
    isActive: true,
    sortOrder: 0,
    ...overrides
  };
}

/** A rule as the form would submit it. */
function rule(action: string, strength = "required") {
  return { type: "rule" as const, payload: { strength, action } };
}

async function build(overrides: Partial<Parameters<typeof buildPrompt>[0]> = {}) {
  return await buildPrompt({
    projectPath: PROJECT,
    projectName: "Demo",
    presetId: null,
    taskName: "",
    description: "Add dark mode to the settings page.",
    requirements: [],
    notes: "",
    ...overrides
  });
}

beforeEach(async () => {
  await seedBuiltinPresets();
});


describe("building a prompt", () => {
  it("produces the same text twice for the same inputs", async () => {
    expect((await build()).prompt).toBe((await build()).prompt);
  });

  it("falls back to the general preset when none was chosen", async () => {
    expect((await build()).presetId).toBe("builtin-general");
  });

  it("uses the preset that was chosen", async () => {
    const built = await build({ presetId: "builtin-bug-fix" });

    expect(built.presetId).toBe("builtin-bug-fix");
    expect(built.prompt).toContain("You are fixing a bug in Demo.");
  });

  it("titles the task from its first line when none was given", async () => {
    expect((await build()).prompt).toContain("Add dark mode to the settings page.");
  });

  it("writes requirements as normalized bullets", async () => {
    const built = await build({ requirements: ["add a theme toggle", "persist the choice"] });

    expect(built.prompt).toContain("- Add a theme toggle.");
    expect(built.prompt).toContain("- Persist the choice.");
  });

  it("lifts bulleted lines out of the description into requirements", async () => {
    const built = await build({
      description: "Add dark mode.\n- toggle in settings\n- restore on startup"
    });

    expect(built.prompt).toContain("- Toggle in settings.");
    expect(built.prompt).toContain("- Restore on startup.");
    // The bullets left the description behind rather than being said twice.
    expect(built.prompt).toContain("Description:\nAdd dark mode.");
  });

  it("drops a section the task has nothing for", async () => {
    expect((await build()).prompt).not.toContain("Additional Context:");
  });
});

describe("priority and deadline", () => {
  it("tells the agent to start with a high-priority task", async () => {
    expect((await build({ priority: "high" })).prompt).toContain(
      "Priority:\nStart with this before other outstanding work."
    );
  });

  it("says a low-priority task can wait", async () => {
    expect((await build({ priority: "low" })).prompt).toContain(
      "Priority:\nThis can wait behind other outstanding work."
    );
  });

  it("says nothing at all about an ordinary task", async () => {
    expect((await build({ priority: "normal" })).prompt).not.toContain("Priority:");
    expect((await build()).prompt).not.toContain("Priority:");
  });

  it("carries the deadline as the date it was given", async () => {
    expect((await build({ deadline: "2026-09-01" })).prompt).toContain("Deadline:\n2026-09-01");
  });

  it("leaves the deadline out when nothing is due", async () => {
    expect((await build({ deadline: null })).prompt).not.toContain("Deadline:");
  });

  it("reaches every preset, not just the default", async () => {
    for (const presetId of ["builtin-bug-fix", "builtin-refactor", "builtin-ui-ux"]) {
      expect((await build({ presetId, priority: "high", deadline: "2026-09-01" })).prompt).toContain(
        "Deadline:\n2026-09-01"
      );
    }
  });
});

describe("the context a prompt carries", () => {
  it("includes this project's facts and rules", async () => {
    await createEntry(entry({ type: "fact", payload: { key: "Framework", value: "Next.js" } }));
    await createEntry(entry(rule("use Yarn instead of npm")));

    const prompt = (await build()).prompt;

    expect(prompt).toContain("- Framework: Next.js");
    expect(prompt).toContain("- Use Yarn instead of npm (required).");
  });

  it("renders a rule's parts in a fixed order, never as loose prose", async () => {
    await createEntry(
      entry({
        type: "rule",
        payload: {
          strength: "forbidden",
          action: "commit .env files",
          condition: "working in a shared branch",
          reason: "they hold real credentials"
        }
      })
    );

    expect((await build()).prompt).toContain(
      "- Commit .env files (forbidden), when working in a shared branch — they hold real credentials."
    );
  });

  it("carries a command and a location as the context they are", async () => {
    await createEntry(entry({ type: "command", payload: { purpose: "run the tests", command: "yarn test" } }));
    await createEntry(entry({ type: "path", payload: { path: "src/services", holds: "API clients" } }));

    const prompt = (await build()).prompt;

    expect(prompt).toContain("- To run the tests: `yarn test`");
    expect(prompt).toContain("- src/services — API clients");
  });

  it("leaves out another project's context", async () => {
    await createEntry(entry({ scopeKey: "/work/other", ...rule("only for the other project") }));

    expect((await build()).prompt).not.toContain("Only for the other project");
  });

  it("leaves out an entry that is switched off", async () => {
    await createEntry(entry({ ...rule("switched off"), isActive: false }));

    expect((await build()).prompt).not.toContain("Switched off");
  });

  it("includes an entry aimed at the preset in play", async () => {
    await createEntry(entry({ ...rule("only when fixing bugs"), appliesTo: ["builtin-bug-fix"] }));

    expect((await build({ presetId: "builtin-bug-fix" })).prompt).toContain("Only when fixing bugs");
    expect((await build({ presetId: "builtin-new-feature" })).prompt).not.toContain(
      "Only when fixing bugs"
    );
  });

  it("carries the shipped global rules once they are seeded", async () => {
    await seedBuiltinContext();

    expect((await build()).prompt).toContain("Change only what the task requires");
  });

  it("reports which entries went in", async () => {
    const created = await createEntry(entry(rule("be counted")));

    expect((await build()).usedEntryIds).toContain(created.id);
  });
});
