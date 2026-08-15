export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

/** Whether the app moved a task on its own, or a person decided to. */
export type TaskStatusSource = "auto" | "manual";

export interface TaskStatusEvent {
  /** Counted, not uuid'd: the order these happened in is the point. */
  id: number;
  taskId: string;
  status: TaskStatus;
  source: TaskStatusSource;
  createdAt: string;
}

export interface Task {
  id: string;
  projectPath: string;
  name: string;
  description: string;
  requirements: string[];
  notes: string;
  /** Preset this task is usually built with, or null to decide each time. */
  presetId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO date, or null when nothing is due. */
  deadline: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type TaskInput = Pick<
  Task,
  | "projectPath"
  | "name"
  | "description"
  | "requirements"
  | "notes"
  | "presetId"
  | "priority"
  | "deadline"
>;

export interface TaskAgentRun {
  id: string;
  taskId: string;
  /** The PTY session it was sent to, empty when it was only copied. */
  agentRunId: string;
  agentLabel: string;
  presetId: string | null;
  /** The exact text the agent was given. */
  generatedPrompt: string;
  startedAt: string;
  completedAt: string | null;
  status: "sent" | "done";
}

export interface TaskAgentRunInput {
  taskId: string;
  agentRunId: string;
  agentLabel: string;
  presetId: string | null;
  generatedPrompt: string;
}
