import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNodeStorage } from "../../../platform/node-storage";

let storage = createNodeStorage();

vi.mock("@chain/sdk", () => ({
  desktop: {
    get storage() {
      return storage;
    }
  }
}));

import type * as RunStore from "@/shared/lib/tasks/run-store";
import type * as StatusEvents from "@/shared/lib/tasks/status-events";
import type * as TaskStore from "@/shared/lib/tasks/task-store";
import type { TaskInput } from "@/shared/lib/tasks/types";

let completeRunsForAgent: typeof RunStore.completeRunsForAgent;
let listRuns: typeof RunStore.listRuns;
let recordRun: typeof RunStore.recordRun;
let listStatusEvents: typeof StatusEvents.listStatusEvents;
let createTask: typeof TaskStore.createTask;
let deleteTask: typeof TaskStore.deleteTask;
let getTask: typeof TaskStore.getTask;
let listAllTasks: typeof TaskStore.listAllTasks;
let listTasks: typeof TaskStore.listTasks;
let setTaskStatus: typeof TaskStore.setTaskStatus;
let updateTask: typeof TaskStore.updateTask;

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

beforeEach(async () => {
  storage = createNodeStorage();
  vi.resetModules();
  ({ completeRunsForAgent, listRuns, recordRun } = await import("@/shared/lib/tasks/run-store"));
  ({ listStatusEvents } = await import("@/shared/lib/tasks/status-events"));
  ({ createTask, deleteTask, getTask, listAllTasks, listTasks, setTaskStatus, updateTask } = await import(
    "@/shared/lib/tasks/task-store"
  ));
});

describe("tasks", () => {
  it("keeps everything the task was written with", async () => {
    const created = await createTask(input({ deadline: "2026-09-01", priority: "high" }));
    const stored = await getTask(created.id);

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

  it("survives being reopened, which is the point of storing them", async () => {
    await createTask(input());
    // A fresh read is what the app does on the next launch.
    expect(await listTasks(PROJECT)).toHaveLength(1);
  });

  it("keeps one project's tasks out of another's", async () => {
    await createTask(input());
    await createTask(input({ projectPath: "/work/other", name: "Elsewhere" }));

    expect((await listTasks(PROJECT)).map((task) => task.name)).toEqual(["Add dark mode"]);
  });

  it("puts work in progress above what has not been started", async () => {
    const first = await createTask(input({ name: "First" }));
    await createTask(input({ name: "Second" }));
    await setTaskStatus(first.id, "doing", "manual");

    expect((await listTasks(PROJECT)).map((task) => task.name)).toEqual(["First", "Second"]);
  });

  it("stamps the time when a task is finished, and clears it when reopened", async () => {
    const created = await createTask(input());

    await setTaskStatus(created.id, "done", "manual");
    expect((await getTask(created.id))?.completedAt).toBeTruthy();

    await setTaskStatus(created.id, "todo", "manual");
    expect((await getTask(created.id))?.completedAt).toBeNull();
  });

  it("edits a task without disturbing its status", async () => {
    const created = await createTask(input());
    await setTaskStatus(created.id, "doing", "manual");

    await updateTask(created.id, input({ name: "Renamed", requirements: ["One", "Two"] }));

    expect(await getTask(created.id)).toEqual(
      expect.objectContaining({ name: "Renamed", requirements: ["One", "Two"], status: "doing" })
    );
  });

  it("deletes a task", async () => {
    const created = await createTask(input());

    expect(await deleteTask(created.id)).toBe(true);
    expect(await getTask(created.id)).toBeNull();
  });
});

describe("the home dashboard's view of every project", () => {
  it("gathers tasks from all projects at once", async () => {
    await createTask(input({ name: "Here" }));
    await createTask(input({ projectPath: "/work/other", name: "Elsewhere" }));

    expect((await listAllTasks()).map((task) => task.name).sort()).toEqual(["Elsewhere", "Here"]);
  });

  it("leads with what is being worked on, then what is most pressing", async () => {
    await createTask(input({ name: "Low, later", priority: "low" }));
    await createTask(input({ name: "High, waiting", priority: "high" }));
    const started = await createTask(input({ name: "Started", priority: "low" }));
    await setTaskStatus(started.id, "doing", "manual");
    const finished = await createTask(input({ name: "Finished", priority: "high" }));
    await setTaskStatus(finished.id, "done", "manual");

    expect((await listAllTasks()).map((task) => task.name)).toEqual([
      "Started",
      "High, waiting",
      "Low, later",
      "Finished"
    ]);
  });

  it("puts a nearer deadline first when the priority is the same", async () => {
    await createTask(input({ name: "Later", deadline: "2026-12-01" }));
    await createTask(input({ name: "Sooner", deadline: "2026-09-01" }));
    await createTask(input({ name: "Undated", deadline: null }));

    expect((await listAllTasks()).map((task) => task.name)).toEqual(["Sooner", "Later", "Undated"]);
  });
});

describe("the record of what an agent was given", () => {
  it("keeps the exact prompt, newest first", async () => {
    const created = await createTask(input());

    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: "builtin-general",
      generatedPrompt: "First prompt"
    });
    await recordRun({
      taskId: created.id,
      agentRunId: "pty-2",
      agentLabel: "Codex",
      presetId: "builtin-bug-fix",
      generatedPrompt: "Second prompt"
    });

    const runs = await listRuns(created.id);

    expect(runs).toHaveLength(2);
    expect(runs.map((run) => run.generatedPrompt)).toContain("First prompt");
    expect(runs.every((run) => run.status === "sent")).toBe(true);
  });

  it("goes when its task goes, rather than pointing at nothing", async () => {
    const created = await createTask(input());
    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    await deleteTask(created.id);

    expect(await listRuns(created.id)).toHaveLength(0);
  });
});

describe("the trail a task leaves", () => {
  it("writes down every move, in the order they happened", async () => {
    const created = await createTask(input());

    await setTaskStatus(created.id, "doing", "manual");
    await setTaskStatus(created.id, "done", "manual");
    await setTaskStatus(created.id, "todo", "manual");

    const events = await listStatusEvents(created.id);

    expect(events.map((event) => event.status)).toEqual(["doing", "done", "todo"]);
    // Counted, so the order holds even inside the same second.
    expect(events.map((event) => event.id)).toEqual([...events.map((e) => e.id)].sort((a, b) => a - b));
  });

  it("tells a move the app made from one the user made", async () => {
    const created = await createTask(input());

    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });
    await setTaskStatus(created.id, "done", "manual");

    expect((await listStatusEvents(created.id)).map((event) => [event.status, event.source])).toEqual([
      ["doing", "auto"],
      ["done", "manual"]
    ]);
  });

  it("goes when its task goes", async () => {
    const created = await createTask(input());
    await setTaskStatus(created.id, "doing", "manual");

    await deleteTask(created.id);

    expect(await listStatusEvents(created.id)).toHaveLength(0);
  });
});

describe("what handing a task to an agent does to it", () => {
  it("starts the task, without being asked", async () => {
    const created = await createTask(input());

    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect((await getTask(created.id))?.status).toBe("doing");
  });

  it("leaves a finished task finished", async () => {
    const created = await createTask(input());
    await setTaskStatus(created.id, "done", "manual");

    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect((await getTask(created.id))?.status).toBe("done");
  });

  it("closes the run when the agent finishes, and leaves the task alone", async () => {
    const created = await createTask(input());
    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    expect(await completeRunsForAgent("pty-1")).toBe(1);

    const [run] = await listRuns(created.id);
    expect(run.status).toBe("done");
    expect(run.completedAt).toBeTruthy();
    // The agent's turn ended; the task is still the user's to close.
    expect((await getTask(created.id))?.status).toBe("doing");
  });

  it("closes nothing twice", async () => {
    const created = await createTask(input());
    await recordRun({
      taskId: created.id,
      agentRunId: "pty-1",
      agentLabel: "Claude",
      presetId: null,
      generatedPrompt: "A prompt"
    });

    await completeRunsForAgent("pty-1");

    expect(await completeRunsForAgent("pty-1")).toBe(0);
  });
});
