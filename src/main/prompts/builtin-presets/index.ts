import { api } from "./api";
import { bugFix } from "./bug-fix";
import { codeReview } from "./code-review";
import { database } from "./database";
import { documentation } from "./documentation";
import { general } from "./general";
import { newFeature } from "./new-feature";
import { refactor } from "./refactor";
import { research } from "./research";
import { testing } from "./testing";
import { uiUx } from "./ui-ux";
import type { BuiltinPreset } from "./types";

/** Shipped with the app, in picker order. */
export const BUILTIN_PRESETS: BuiltinPreset[] = [
  general,
  newFeature,
  bugFix,
  refactor,
  research,
  uiUx,
  database,
  api,
  testing,
  documentation,
  codeReview
];

/** Used when a task names no preset. */
export const DEFAULT_PRESET_ID = general.id;

export type { BuiltinPreset };
