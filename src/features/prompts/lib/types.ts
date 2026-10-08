import type { ContextPayload, ContextTypeId } from "./context-types";

export type ContextScope = "global" | "project";

/** What to do first, and nothing more than that. */
export type PromptPriority = "low" | "normal" | "high";

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  template: string;
  isBuiltin: boolean;
  sortOrder: number;
}

export interface PromptPresetInput {
  name: string;
  description: string;
  template: string;
}

export interface ContextEntry {
  id: string;
  scope: ContextScope;
  /** Project path for project scope, empty for global. */
  scopeKey: string;
  /** Which kind of context this is, and so which fields it carries. */
  type: ContextTypeId;
  category: string;
  /** The typed fields for that kind, exactly as the user filled them in. */
  payload: ContextPayload;
  /** Preset ids this entry is aimed at. Empty means every task. */
  appliesTo: string[];
  /** Group switched on or off as one. */
  pack: string;
  isActive: boolean;
  sortOrder: number;
}

export type ContextEntryInput = Omit<ContextEntry, "id">;

export interface BuildPromptInput {
  projectPath: string;
  projectName: string;
  presetId: string | null;
  taskName: string;
  description: string;
  requirements: string[];
  notes: string;
  /** Where this sits against the user's other work. Omitted reads as normal. */
  priority?: PromptPriority;
  /** ISO date, or null when nothing is due. */
  deadline?: string | null;
}

export interface BuiltPrompt {
  prompt: string;
  /** Which preset produced it, so the preview can say. */
  presetId: string | null;
  /** Context that went in, for the preview's "what was included" line. */
  usedEntryIds: string[];
}
