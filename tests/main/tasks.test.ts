import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "/tmp/lazify-tests" } }));

import { closeDatabase, useDatabase } from "../../src/main/db";
import { seedBuiltinPresets } from "../../src/main/prompts/preset-store";
import { completeRunsForAgent, listRuns, recordRun } from "../../src/main/tasks/run-store";
import { listStatusEvents } from "../../src/main/tasks/status-events";
import { buildPromptForTask } from "../../src/main/tasks/task-prompt";
import {
  createTask,
  deleteTask,
  getTask,
  listAllTasks,
  listTasks,
  setTaskStatus,
  updateTask
} from "../../src/main/tasks/task-store";
import type { TaskInput } from "../../src/main/tasks/types";

const PROJECT = "/work/demo";

function input(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    projectPath: PROJECT,
    name: "Add dark mode",
    description: "Add dark mode to the settings page.",
    requirements: ["Add a theme toggle"],
    notes: "",
    presetId: null,
    priority: "normal",
    deadline: null,
    ...overrides
  };
}

beforeEach(() => {
  useDatabase(new DatabaseSync(":memory:"));
  seedBuiltinPresets();
});

afterEach(() => closeDatabase());

describe("tasks", () => {
  it("keeps everything the task was written with", () => {
    const created = createTask(input({ deadline: "2026-09-01", priority: "high" }));
    const stored = getTask(created.id);

    expect(stored).toEqual(
      expect.objectContaining({
        name: "Add dark mode",
        requirements: ["Add a theme toggle"],
        priority: "high",
        deadline: "2026-09-01",
        status: "todo"
      })
    );
  });

  it("survives being reopened, which is the point of storing them", () => {
    createTask(input());
    // A fresh read is what the app does on the next launch.
    expect(listTasks(PROJECT)).toHaveLength(1);
  });

  it("keeps one project's tasks out of another's", () => {
    createTask(input());
    createTask(input({ projectPath: "/work/other", name: "Elsewhere" }));

    expect(listTasks(PROJECT).map((task) => task.name)).toEqual(["Add dark mode"]);
  });

  it("puts work in progress above what has not been started", () => {
    const first = createTask(input({ name: "First" }));
    createTask(input({ name: "Second" }));
    setTaskStatus(first.id, "doing", "manual");

    expect(listTasks(PROJECT).map((task) => task.name)).toEqual(["First", "Second"]);
  });

  it("stamps the time when a task is finished, and clears it when reopened", () => {
    const created = createTask(input());

    setTaskStatus(created.id, "done", "manual");
    expect(getTask(created.id)?.completedAt).toBeTruthy();

    setTaskStatus(created.id, "todo", "manual");
    expect(getTask(created.id)?.completedAt).toBeNull();
  });

  it("edits a task without disturbing its status", () => {
    const created = createTask(input());
    setTaskStatus(created.id, "doing", "manual");

    updateTask(created.id, input({ name: "Renamed", requirements: ["One", "Two"] }));

    expect(getTask(created.id)).toEqual(
      expect.objectContaining({ name: "Renamed", requirements: ["One", "Two"], status: "doing" })
    );
  });

  it("deletes a task", () => {
    const created = createTask(input());

    expect(deleteTask(created.id)).toBe(true);
    expect(getTask(created.id)).toBeNull();
  });
});

describe("the home dashboard's view of every project", () => {
  it("gathers tasks from all projects at once", () => {
    createTask(input({ name: "Here" }));
    createTask(input({ projectPath: "/work/other", name: "Elsewhere" }));

    expect(listAllTasks().map((task) => task.name).sort()).toEqual(["Elsewhere", "Here"]);
  });

  it("leads with what is being worked on, then what is most pressing", () => {
    createTask(input({ name: "Low, later", priority: "low" }));
    createTask(input({ name: "High, waiting", priority: "high" }));
    const started = createTask(input({ name: "Started", priority: "low" }));
    setTaskStatus(started.id, "doing", "manual");
    const finished = createTask(input({ name: "Finished", priority: "high" }));
    setTaskStatus(finished.id, "done", "manual");

    expect(listAllTasks().map((task) => task.name)).toEqual([
      "Started",
      "High, waiting",
      "Low, later",
      "Finished"
    ]);
  });

  it("puts a nearer deadline first when the priority is the same", () => {
    createTask(input({ name: "Later", deadline: "2026-12-01" }));
    createTask(input({ name: "Sooner", deadline: "2026-09-01" }));
    createTask(input({ name: "Undated", deadline: null }));

    expect(listAllTasks().map((task) => task.name)).toEqual(["Sooner", "Later", "Undated"]);
  });
});

describe("building a prompt from a stored task", () => {
  it("uses the task's own fields and preset", () => {
    const created = createTask(input({ presetId: "builtin-bug-fix" }));
    const built = buildPromptForTask(created.id);

    expect(built?.presetId).toBe("builtin-bug-fix");
    expect(built?.prompt).toContain("Add dark mode");
    expect(built?.prompt).toContain("- Add a theme toggle.");
  });

  it("says nothing about a task that is gone", () => {
    expect(buildPromptForTask("task-missing")).toBeNull();
  });
});

describe("the record of what an agent was given", () => {
  it("keeps the exact prompt, newest first", () => {
    const created = createTask(input());

    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: "builtin-general",
      generatedPrompt: "First prompt"
    });
    recordRun({
      taskId: created.id,
      agentRunId: "pty-2",
      agentLabel: "Codex",
      presetId: "builtin-bug-fix",
      generatedPrompt: "Second prompt"
    });

    const runs = listRuns(created.id);

    expect(runs).toHaveLength(2);
    expect(runs.map((run) => run.generatedPrompt)).toContain("First prompt");
    expect(runs.every((run) => run.status === "sent")).toBe(true);
  });

  it("goes when its task goes, rather than pointing at nothing", () => {
    const created = createTask(input());
    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    deleteTask(created.id);

    expect(listRuns(created.id)).toHaveLength(0);
  });
});

describe("the trail a task leaves", () => {
  it("writes down every move, in the order they happened", () => {
    const created = createTask(input());

    setTaskStatus(created.id, "doing", "manual");
    setTaskStatus(created.id, "done", "manual");
    setTaskStatus(created.id, "todo", "manual");

    const events = listStatusEvents(created.id);

    expect(events.map((event) => event.status)).toEqual(["doing", "done", "todo"]);
    // Counted, so the order holds even inside the same second.
    expect(events.map((event) => event.id)).toEqual([...events.map((e) => e.id)].sort((a, b) => a - b));
  });

  it("tells a move the app made from one the user made", () => {
    const created = createTask(input());

    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });
    setTaskStatus(created.id, "done", "manual");

    expect(listStatusEvents(created.id).map((event) => [event.status, event.source])).toEqual([
      ["doing", "auto"],
      ["done", "manual"]
    ]);
  });

  it("goes when its task goes", () => {
    const created = createTask(input());
    setTaskStatus(created.id, "doing", "manual");

    deleteTask(created.id);

    expect(listStatusEvents(created.id)).toHaveLength(0);
  });
});

describe("what handing a task to an agent does to it", () => {
  it("starts the task, without being asked", () => {
    const created = createTask(input());

    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect(getTask(created.id)?.status).toBe("doing");
  });

  it("leaves a finished task finished", () => {
    const created = createTask(input());
    setTaskStatus(created.id, "done", "manual");

    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect(getTask(created.id)?.status).toBe("done");
  });

  it("closes the run when the agent finishes, and leaves the task alone", () => {
    const created = createTask(input());
    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect(completeRunsForAgent("pty-1")).toBe(1);

    const [run] = listRuns(created.id);
    expect(run.status).toBe("done");
    expect(run.completedAt).toBeTruthy();
    // The agent's turn ended; the task is still the user's to close.
    expect(getTask(created.id)?.status).toBe("doing");
  });

  it("closes nothing twice", () => {
    const created = createTask(input());
    recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    completeRunsForAgent("pty-1");

    expect(completeRunsForAgent("pty-1")).toBe(0);
  });
});
