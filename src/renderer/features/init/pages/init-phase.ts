import type { SavedInitWorkflowConfig } from "@renderer/shared/types/lazify";

/** The distinct screens the init flow moves through, in order. */
export enum InitPhase {
  /** Nothing picked yet: choose the source and pick a stack/template. */
  Selection = "selection",
  /** A source is chosen: fill in project details before scaffolding. */
  Configure = "configure",
  /** Details are saved: arrange the file structure before creation. */
  Structure = "structure",
}

/** Resolve the current phase from the raw workflow state. */
export function resolveInitPhase(state: {
  hasSelection: boolean;
  inStructureStage: boolean;
  savedInitWorkflowConfig: SavedInitWorkflowConfig | null;
}): InitPhase {
  if (!state.hasSelection) {
    return InitPhase.Selection;
  }
  if (state.inStructureStage && state.savedInitWorkflowConfig) {
    return InitPhase.Structure;
  }
  return InitPhase.Configure;
}
