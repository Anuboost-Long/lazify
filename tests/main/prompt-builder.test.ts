import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The stores reach for app.getPath; every test here opens its own database.
vi.mock("electron", () => ({ app: { getPath: () => "/tmp/lazify-tests" } }));

import { closeDatabase, useDatabase } from "../../src/main/db";
import { createEntry } from "../../src/main/prompts/context-store";
import { buildPrompt } from "../../src/main/prompts/prompt-builder";
import { seedBuiltinContext } from "../../src/main/prompts/builtin-context";
import { seedBuiltinPresets } from "../../src/main/prompts/preset-store";
import type { ContextEntryInput } from "../../src/main/prompts/types";

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

function build(overrides: Partial<Parameters<typeof buildPrompt>[0]> = {}) {
  return buildPrompt({
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

beforeEach(() => {
  useDatabase(new DatabaseSync(":memory:"));
  seedBuiltinPresets();
});

afterEach(() => closeDatabase());

describe("building a prompt", () => {
  it("produces the same text twice for the same inputs", () => {
    expect(build().prompt).toBe(build().prompt);
  });

  it("falls back to the general preset when none was chosen", () => {
    expect(build().presetId).toBe("builtin-general");
  });

  it("uses the preset that was chosen", () => {
    const built = build({ presetId: "builtin-bug-fix" });

    expect(built.presetId).toBe("builtin-bug-fix");
    expect(built.prompt).toContain("You are fixing a bug in Demo.");
  });

  it("titles the task from its first line when none was given", () => {
    expect(build().prompt).toContain("Add dark mode to the settings page.");
  });

  it("writes requirements as normalized bullets", () => {
    const built = build({ requirements: ["add a theme toggle", "persist the choice"] });

    expect(built.prompt).toContain("- Add a theme toggle.");
    expect(built.prompt).toContain("- Persist the choice.");
  });

  it("lifts bulleted lines out of the description into requirements", () => {
    const built = build({
      description: "Add dark mode.\n- toggle in settings\n- restore on startup"
    });

    expect(built.prompt).toContain("- Toggle in settings.");
    expect(built.prompt).toContain("- Restore on startup.");
    // The bullets left the description behind rather than being said twice.
    expect(built.prompt).toContain("Description:\nAdd dark mode.");
  });

  it("drops a section the task has nothing for", () => {
    expect(build().prompt).not.toContain("Additional Context:");
  });
});

describe("priority and deadline", () => {
  it("tells the agent to start with a high-priority task", () => {
    expect(build({ priority: "high" }).prompt).toContain(
      "Priority:\nStart with this before other outstanding work."
    );
  });

  it("says a low-priority task can wait", () => {
    expect(build({ priority: "low" }).prompt).toContain(
      "Priority:\nThis can wait behind other outstanding work."
    );
  });

  it("says nothing at all about an ordinary task", () => {
    expect(build({ priority: "normal" }).prompt).not.toContain("Priority:");
    expect(build().prompt).not.toContain("Priority:");
  });

  it("carries the deadline as the date it was given", () => {
    expect(build({ deadline: "2026-09-01" }).prompt).toContain("Deadline:\n2026-09-01");
  });

  it("leaves the deadline out when nothing is due", () => {
    expect(build({ deadline: null }).prompt).not.toContain("Deadline:");
  });

  it("reaches every preset, not just the default", () => {
    for (const presetId of ["builtin-bug-fix", "builtin-refactor", "builtin-ui-ux"]) {
      expect(build({ presetId, priority: "high", deadline: "2026-09-01" }).prompt).toContain(
        "Deadline:\n2026-09-01"
      );
    }
  });
});

describe("the context a prompt carries", () => {
  it("includes this project's facts and rules", () => {
    createEntry(entry({ type: "fact", payload: { key: "Framework", value: "Next.js" } }));
    createEntry(entry(rule("use Yarn instead of npm")));

    const prompt = build().prompt;

    expect(prompt).toContain("- Framework: Next.js");
    expect(prompt).toContain("- Use Yarn instead of npm (required).");
  });

  it("renders a rule's parts in a fixed order, never as loose prose", () => {
    createEntry(
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

    expect(build().prompt).toContain(
      "- Commit .env files (forbidden), when working in a shared branch — they hold real credentials."
    );
  });

  it("carries a command and a location as the context they are", () => {
    createEntry(entry({ type: "command", payload: { purpose: "run the tests", command: "yarn test" } }));
    createEntry(entry({ type: "path", payload: { path: "src/services", holds: "API clients" } }));

    const prompt = build().prompt;

    expect(prompt).toContain("- To run the tests: `yarn test`");
    expect(prompt).toContain("- src/services — API clients");
  });

  it("leaves out another project's context", () => {
    createEntry(entry({ scopeKey: "/work/other", ...rule("only for the other project") }));

    expect(build().prompt).not.toContain("Only for the other project");
  });

  it("leaves out an entry that is switched off", () => {
    createEntry(entry({ ...rule("switched off"), isActive: false }));

    expect(build().prompt).not.toContain("Switched off");
  });

  it("includes an entry aimed at the preset in play", () => {
    createEntry(entry({ ...rule("only when fixing bugs"), appliesTo: ["builtin-bug-fix"] }));

    expect(build({ presetId: "builtin-bug-fix" }).prompt).toContain("Only when fixing bugs");
    expect(build({ presetId: "builtin-new-feature" }).prompt).not.toContain(
      "Only when fixing bugs"
    );
  });

  it("carries the shipped global rules once they are seeded", () => {
    seedBuiltinContext();

    expect(build().prompt).toContain("Change only what the task requires");
  });

  it("reports which entries went in", () => {
    const created = createEntry(entry(rule("be counted")));

    expect(build().usedEntryIds).toContain(created.id);
  });
});
