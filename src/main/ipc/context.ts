import type { BrowserWindow } from "electron";

import type { AttentionDetector } from "../agents/attention-detector";
import type { Autopilot } from "../agents/autopilot";
import type { AutopilotHold } from "../agents/autopilot-policy";
import type { CommandRunner } from "../command-runner";
import type { PtyRunner } from "../pty-runner";
import type { WorkflowEngine } from "../scaffolding/workflow-engine";

export interface IpcContext {
  readonly mainWindow: BrowserWindow | null;
  emitToRenderer: (channel: string, payload: unknown) => void;
  focusRun: (payload: { runId: string; projectPath: string }) => void;
  emitAttention: (runId: string, waiting: boolean, hold?: AutopilotHold | null) => void;
  commandRunner: CommandRunner;
  workflowEngine: WorkflowEngine;
  ptyRunner: PtyRunner;
  autopilot: Autopilot;
  attentionDetector: AttentionDetector;
}
